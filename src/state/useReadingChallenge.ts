import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';
import { fetchReadingDetail, ReadingApiError, ReadingCommand, ReadingDetail, ReadingDetailSchema, sendReadingCommand } from '../data/reading';
import { loadJSON, readJSON, saveJSON } from './persist';
import { readingNative, NativeReadingSession, ReadingCapabilities, ReadingLiveActivityStatus, isLegacyReadingQASession } from './readingNative';
import { ReadingOutbox, ReadingQueue, READING_OUTBOX_KEY, readingErrorMessage, hasPendingReadingClose } from './readingOutbox';
import { ReadingBookMetadata } from '../data/readingBooks';
import { anchoredNow, localApproaches, ReadingClockAnchor, readingDayEnd, readingLocalView } from '../data/readingOffline';

/** The server did not answer (no internet, airplane mode, timeout or no fresh sign-in token). */
export class ReadingOfflineError extends Error {
  constructor() { super('Reading server unreachable'); this.name = 'ReadingOfflineError'; }
}
/** A failure to reach the server, not a server or local refusal (those carry Russian messages or HTTP codes). */
export function isReadingOffline(error: unknown) {
  if (error instanceof ReadingOfflineError) return true;
  return !(error instanceof ReadingApiError) && !(error instanceof Error && /[А-Яа-яЁё]/.test(error.message));
}
/** Never let a slow network hold the screen: after `ms` the caller continues offline. */
function withDeadline<T>(promise: Promise<T>, ms?: number): Promise<T> {
  if (!ms) return promise;
  promise.catch(() => {});
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new ReadingOfflineError()), ms))]);
}
/** How long a user action waits for a background refresh, and how long a background refresh may take. */
const ACTION_WAIT_MS = 4000, REFRESH_DEADLINE_MS = 10_000;
/** Last signed server time + the monotonic clock reading for it, per account (the token names the account). */
export const readingClockKey = (accountId: string) => `dvg.readingClock.v2.${accountId}`;
/** Longer round trips are not used as an anchor: the server time could be anywhere inside them. */
const READING_ANCHOR_MAX_RTT_MS = 10_000;
/** Real time when the phone can prove it (server anchor + monotonic clock), else its own date. */
type ReadingPhoneNow = { now: number; source: 'synced' | 'device'; syncedAt?: number; syncNonce?: string; syncToken?: string };
async function readingPhoneNow(accountId: string): Promise<ReadingPhoneNow> {
  const [anchor, clock] = await Promise.all([loadJSON<ReadingClockAnchor | null>(readingClockKey(accountId), null).catch(() => null),
    readingNative.clock?.().catch(() => null) ?? null]);
  const now = anchoredNow(anchor, clock);
  if (now === null || !anchor) return { now: Date.now(), source: 'device' };
  return { now, source: 'synced', syncedAt: anchor.serverNow,
    ...(anchor.nonce && anchor.token ? { syncNonce: anchor.nonce, syncToken: anchor.token } : {}) };
}
function readingClockNonce() {
  try { return Array.from(Crypto.getRandomBytes(16), b => b.toString(16).padStart(2, '0')).join(''); }
  catch { return undefined; } // no secure randomness: the anchor stays unsigned (today-only starts)
}
/** App Attest key of this installation for one account (iOS). */
export const readingAttestKey = (accountId: string) => `dvg.readingAttest.v1.${accountId}`;
/** Same text as the server's readingStartClientData: every field that decides the day of the approach. */
export const readingStartClientData = (s: { sessionId: string; startedAt: number; startedAtSource: string; syncedAt?: number; syncNonce?: string }) =>
  `divergents-reading-start:${s.sessionId}:${s.startedAt}:${s.startedAtSource}:${s.syncedAt ?? ''}:${s.syncNonce ?? ''}`;
// One registration attempt per account per app launch; Apple's service may be unreachable.
const attestAttempts = new Set<string>();
async function registerAttestKey(account: string, value: string) {
  if (attestAttempts.has(account)) return;
  attestAttempts.add(account);
  if (await loadJSON<{ keyId: string } | null>(readingAttestKey(account), null)) return;
  if (!readingNative.attest || !await readingNative.attest.supported()) return;
  const keyId = await readingNative.attest.generateKey();
  if (!keyId) return;
  const attestation = await readingNative.attest.attestKey(keyId, `divergents-reading-key:${account}:${keyId}`);
  if (!attestation) return;
  await sendReadingCommand(value, { action: 'attestKey', operationId: Crypto.randomUUID(), keyId, attestation });
  await saveJSON(readingAttestKey(account), { keyId }, { strict: true });
}
export type ReadingRejectedApproach = { sessionId: string; book: string; elapsedMs?: number; pages?: number; message: string; at: number };

// A stable operation id survives app/extension death; retries keep the exact payload.
export async function readingOperationId(sessionId: string, action: string) {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sessionId}:${action}`);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
function targetRemaining(data: ReadingDetail | null, local: NativeReadingSession, remainingBudget: number) {
  const saved = data?.me?.history.find(d => d.day === data.session?.day)?.elapsedMs ?? 0;
  // A native session captures its goal at start. Later server history must not
  // double-count a reported segment or change the paused display.
  return (local.targetMs ?? 3_600_000 - saved) - (local.budgetMs - remainingBudget);
}
function localRemaining(local: NativeReadingSession): Promise<number> {
  if (local.measuredElapsedMs != null) return Promise.resolve(Math.max(0, local.budgetMs - local.measuredElapsedMs));
  // A lock-screen pause freezes the journal's exact elapsed value. Never read
  // wall-clock progress (or a later session) to display this paused approach.
  return local.status === 'paused' && local.elapsedMs != null
    ? Promise.resolve(Math.max(0, local.budgetMs - local.elapsedMs))
    : readingNative.remainingMs();
}
function isTerminalSession(local: NativeReadingSession | null) {
  return !!local && local.status === 'paused' && (local.resumeVersion !== 1 || local.terminal === true);
}
function isSoftPause(local: NativeReadingSession | null) {
  return local?.resumeVersion === 1 && local.status === 'paused' && local.terminal === false;
}
/** A start whose server outcome is not known yet on this phone. It is saved before the
 * request, so a lost POST or follow-up GET response is finished later with the SAME
 * session id and device; a second reservation is never created for it. */
export type ReadingPendingStart = { accountId: string; challengeId: string; sessionId: string; deviceId: string;
  operationId: string; book: string; createdAt: number };
export const readingPendingStartKey = (accountId: string, challengeId: string) => `dvg.readingPendingStart.v1.${accountId}.${challengeId}`;
// Starts being sent right now in this process, by pending-start key. Another screen
// instance must not forget such an attempt while its request is still in flight.
const startsInFlight = new Set<string>();
function validatePageReport(pages: number, nextPage?: number) {
  if (!Number.isInteger(pages) || pages < 0 || pages > 10_000
    || nextPage !== undefined && (!Number.isInteger(nextPage) || nextPage < 0 || nextPage > 100_000))
    throw new Error('Проверьте количество страниц перед сохранением подхода.');
}
export type ReadingSessionNotice = { kind: 'test-running' | 'other-account' | 'other-challenge' | 'other-device'; message: string };
function sessionNoticeFor(local: NativeReadingSession | null, account: string, sessionId?: string): ReadingSessionNotice | undefined {
  if (!local) return;
  if (isLegacyReadingQASession(local)) return { kind: 'test-running',
    message: 'На телефоне ещё идёт проверочный таймер. Поставьте его на паузу в «Divergents Reading QA» и нажмите «Повторить». Реальные результаты не затронуты.' };
  if (local.accountId !== account) return { kind: 'other-account',
    message: 'Сохранён незавершённый подход другого аккаунта. Рейтинг и правила доступны. Для нового таймера сначала войдите в прежний аккаунт и сохраните его страницы; затем вернитесь и нажмите «Повторить».' };
  if (local.sessionId !== sessionId) return { kind: 'other-challenge',
    message: 'На телефоне сохранён подход другого челленджа. Откройте тот челлендж и сохраните страницы, затем вернитесь и нажмите «Повторить». Рейтинг и правила доступны.' };
}
export function useReadingChallenge(challengeId: string) {
  const { userId, getToken } = useAuth();
  const authRef = useRef({ userId, getToken }); authRef.current = { userId, getToken };
  const [data, setData] = useState<ReadingDetail | null>(null);
  const [nativeSession, setNativeSession] = useState<NativeReadingSession | null>(null);
  // A verified local running session can always be paused by its owner, even
  // when no cached/server challenge detail is available to identify it here.
  const [localPauseAccount, setLocalPauseAccount] = useState<string | null>(null);
  const ownedRunning = useRef<NativeReadingSession | null>(null);
  const [liveActivity, setLiveActivity] = useState<{ accountId: string; sessionId: string; status: ReadingLiveActivityStatus } | null>(null);
  const [liveActivityBusy, setLiveActivityBusy] = useState(false);
  const liveActivityRequest = useRef(0);
  const lastReconcile = useRef<{ key: string; at: number } | null>(null);
  const restoreRequest = useRef<{ context: symbol; operation: symbol } | null>(null);
  const timerControlRequest = useRef<{ context: symbol; operation: symbol } | null>(null);
  const [controllingTimer, setControllingTimer] = useState(false);
  const pageSaveRequest = useRef<{ context: symbol; operation: symbol } | null>(null);
  const [savingPages, setSavingPages] = useState(false);
  const terminalSync = useRef<string | undefined>(undefined);
  const [remainingMs, setRemaining] = useState(3_600_000);
  const [capabilities, setCapabilities] = useState<ReadingCapabilities>({ available: false, authorized: false, selectedCount: 0, platform: '', blockingMode: 'selected' });
  const [error, setError] = useState<string>();
  const [sessionNotice, setSessionNotice] = useState<ReadingSessionNotice>();
  const [deviceIdentity, setDeviceIdentity] = useState<{ account: string; id: string | null }>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef<{ context: symbol; operation: symbol; kind: 'action' | 'refresh'; done: Promise<void> } | null>(null), mounted = useRef(true);
  // A user action (Start, pages, join…) that is waiting for or running its operation.
  // Background refreshes never swallow it; a second user action is ignored meanwhile.
  const actionRef = useRef<{ context: symbol; operation: symbol } | null>(null);
  // A sync requested while another operation runs (e.g. pages saved during a stalled
  // refresh) is performed right after it, instead of waiting for the 30-second cycle.
  const resyncRef = useRef(false);
  const synchronizeRef = useRef<() => Promise<unknown>>(async () => undefined);
  const [actionBusy, setActionBusy] = useState(false);
  const [startRecovery, setStartRecovery] = useState<ReadingPendingStart | null>(null);
  const startRecoveryRef = useRef<ReadingPendingStart | null>(null);
  // Session id whose pending-start check has finished, so a reservation is not briefly
  // offered for zero-credit closing before «Продолжить запуск» is known.
  const [reconciledFor, setReconciledFor] = useState<string | null | undefined>(undefined);
  const dataRef = useRef(data); dataRef.current = data;
  const requestStartedAt = useRef(0);
  // Last server copy (raw, also cached on disk) and whether the screen currently shows it without a fresh answer.
  const serverDetailRef = useRef<ReadingDetail | null>(null);
  const staleRef = useRef(false);
  const [offline, setOffline] = useState(false);
  const [localCounts, setLocalCounts] = useState({ pending: 0, pendingToday: 0 });
  const [rejected, setRejected] = useState<ReadingRejectedApproach[]>([]);
  const account = userId ?? '';
  const cacheKey = `dvg.readingDetail.${account}.${challengeId}`;
  const pendingStartKey = readingPendingStartKey(account, challengeId);
  const rejectedKey = `dvg.readingRejected.v1.${account}.${challengeId}`;
  /** A fresh token, or offline. Clerk cannot refresh its short-lived token without internet. */
  const token = useCallback(async () => {
    const value = await withDeadline(authRef.current.getToken(), 8000).catch(() => null);
    if (!value) throw new ReadingOfflineError();
    return value;
  }, []);
  const context = useMemo(() => Symbol('reading-screen'), [account, challengeId]);
  const contextRef = useRef(context); contextRef.current = context;
  const current = useCallback(() => mounted.current && authRef.current.userId === account && contextRef.current === context, [account, context]);
  const observeLocalSession = useCallback((local: NativeReadingSession | null) => {
    if (!current()) return;
    const owned = local?.accountId === account && local.status === 'running' ? local : null;
    if (owned?.accountId !== ownedRunning.current?.accountId || owned?.sessionId !== ownedRunning.current?.sessionId) {
      liveActivityRequest.current += 1;
      setLiveActivity(null);
    }
    ownedRunning.current = owned;
    setLocalPauseAccount(owned ? account : null);
  }, [account, current]);
  const reconcileLiveActivity = useCallback(async (local: NativeReadingSession | null, force = false) => {
    if (!current() || local?.accountId !== account || restoreRequest.current?.context === context) return;
    const key = `${account}:${local.sessionId}:${local.status}`, now = performance.now();
    // A paused native journal can trigger network retries from the one-second
    // clock. Those retries must not become one-second ActivityKit updates.
    if (!force && lastReconcile.current?.key === key && now - lastReconcile.current.at < 30_000) return;
    lastReconcile.current = { key, at: now };
    const request = ++liveActivityRequest.current;
    let status: ReadingLiveActivityStatus;
    try { status = await readingNative.reconcileLiveActivity(account, local.sessionId); }
    catch { status = { state: 'error', canRestore: true }; }
    if (current() && request === liveActivityRequest.current && ownedRunning.current?.sessionId === local.sessionId
      && ownedRunning.current.accountId === account) setLiveActivity({ accountId: account, sessionId: local.sessionId, status });
  }, [account, context, current]);
  const refreshLocalSession = useCallback(async () => {
    try {
      const local = await readingNative.snapshot();
      if (!current()) return;
      observeLocalSession(local);
      void reconcileLiveActivity(local, true);
      if (local?.accountId === account && local.sessionId === dataRef.current?.session?.id) {
        // Adopt a lock-screen pause before any network response, including when
        // another server operation is busy. The local journal is authoritative.
        setNativeSession(local);
        const remaining = await localRemaining(local);
        if (current()) setRemaining(targetRemaining(dataRef.current, local, remaining));
      } else if (!local) {
        setNativeSession(null); setSessionNotice(undefined);
      }
    } catch (e) {
      if (current()) {
        liveActivityRequest.current += 1; setLiveActivity(null);
        setError(readingErrorMessage(e));
      }
    }
  }, [account, current, observeLocalSession, reconcileLiveActivity]);
  const rememberRejected = useCallback(async (forChallenge: string, record: ReadingRejectedApproach) => {
    const key = `dvg.readingRejected.v1.${account}.${forChallenge}`;
    const list = [...(await loadJSON<ReadingRejectedApproach[]>(key, [])).filter(r => r.sessionId !== record.sessionId), record].slice(-10);
    await saveJSON(key, list, { strict: true });
    if (current() && key === rejectedKey) setRejected(list);
  }, [account, current, rejectedKey]);
  const queue = useMemo(() => new ReadingOutbox(account, {
    read: async () => { const r = await readJSON<ReadingQueue | null>(READING_OUTBOX_KEY, null); if (!r.ok) throw new Error('Не удалось прочитать сохранённые действия'); return r.value; },
    write: q => saveJSON(READING_OUTBOX_KEY, q, { strict: true }),
    isCurrentAccount: current,
    send: async command => {
      const value = await token();
      if (!current()) throw new Error('Аккаунт изменился');
      return sendReadingCommand(value, command);
    },
    // The server refused an approach started without internet: keep a visible record and
    // release this phone's timer for it (its time cannot be credited anymore). The record is kept
    // even when the timer is not running yet: a start racing this refusal is released by the next sync.
    onRejectedStart: async (start, dropped, error) => {
      const sessionId = String(start.sessionId ?? '');
      let local: NativeReadingSession | null = null;
      try { local = await readingNative.snapshot(); } catch { /* evidence stays in the record below */ }
      const own = local?.accountId === account && local.sessionId === sessionId ? local : null;
      const stop = dropped.find(c => c.action === 'stop'), report = dropped.find(c => c.action === 'report');
      await rememberRejected(String(start.challengeId ?? ''), { sessionId, book: String(start.book ?? ''), message: error.message, at: Date.now(),
        elapsedMs: typeof stop?.elapsedMs === 'number' ? stop.elapsedMs : own?.elapsedMs ?? undefined,
        pages: typeof report?.pages === 'number' ? report.pages : undefined });
      if (own) {
        try {
          if (own.status === 'running') await readingNative.pause();
          await readingNative.acknowledge(account, sessionId);
        } catch { /* the next synchronization shows the remaining journal */ }
      }
    },
    // The server definitively refused the time or pages of an approach: keep a visible record.
    onRejectedClose: async (command, dropped, error) => {
      const sessionId = String(command.sessionId ?? '');
      const known = [serverDetailRef.current?.session, dataRef.current?.session].find(s => s?.id === sessionId);
      const report = command.action === 'report' ? command : dropped.find(c => c.action === 'report');
      await rememberRejected(String(command.challengeId ?? ''), { sessionId, book: known?.book ?? '', message: error.message, at: Date.now(),
        elapsedMs: typeof command.elapsedMs === 'number' ? command.elapsedMs : undefined,
        pages: typeof report?.pages === 'number' ? report.pages : undefined });
    },
    // Delivered, but the server did not credit the time (it overlaps another approach).
    onReceipt: async (command, receipt) => {
      if (command.action !== 'stop' || !receipt.rejected) return;
      const sessionId = String(command.sessionId ?? '');
      const known = [serverDetailRef.current?.session, dataRef.current?.session].find(s => s?.id === sessionId);
      await rememberRejected(String(command.challengeId ?? ''), { sessionId, book: known?.book ?? '', at: Date.now(),
        message: receipt.message ?? 'Подход пересекается по времени с другим подходом и не засчитан.',
        elapsedMs: typeof command.elapsedMs === 'number' ? command.elapsedMs : undefined });
    },
  }), [account, current, token, rememberRejected]);
  /** Server copy + approaches saved on this phone but not delivered yet. `stale`: no fresh server answer,
   * so the calendar day follows the phone clock. Never sends anything. */
  const applyLocalView = useCallback(async (raw: ReadingDetail, stale: boolean) => {
    let approaches: ReturnType<typeof localApproaches> = [];
    try { approaches = localApproaches((await queue.pending()).commands, challengeId, raw); } catch { /* unreadable queue: show the server copy */ }
    const view = readingLocalView(raw, approaches, stale ? (await readingPhoneNow(account)).now : Date.now(), stale);
    if (!current()) return view;
    serverDetailRef.current = raw; staleRef.current = stale;
    setData(view); dataRef.current = view; setOffline(stale);
    setLocalCounts({ pending: approaches.length,
      pendingToday: approaches.filter(a => a.phase === 'saved' && a.day === view.currentDay).length });
    return view;
  }, [queue, challengeId, current]);
  const refresh = useCallback(async (deadlineMs?: number) => {
    const startedAt = performance.now();
    const value = await token();
    if (!current()) return null;
    // Fresh unpredictable nonce per request: only the signed clock answering THIS request may anchor
    // the phone's clock (a replayed or pre-fetched answer carries another nonce).
    const nonce = readingClockNonce();
    // Monotonic reading BEFORE the request: the server time is later than it, so an anchor built on it
    // can only run slightly ahead (bounded by the round trip), never behind — even if the app is
    // suspended between the answer and the next line.
    const sent = await readingNative.clock?.().catch(() => null);
    const result = await withDeadline(fetchReadingDetail(value, challengeId, nonce), deadlineMs);
    if (!current()) return null;
    if (result.id !== challengeId) throw new Error('Сервер вернул другой челлендж. Повторите обновление.');
    requestStartedAt.current = startedAt;
    const received = sent ? await readingNative.clock?.().catch(() => null) : null;
    if (sent && received && account && received.bootId === sent.bootId && received.uptimeMs >= sent.uptimeMs
      && received.uptimeMs - sent.uptimeMs <= READING_ANCHOR_MAX_RTT_MS) {
      const signed = nonce && result.clock?.nonce === nonce ? result.clock : undefined;
      const anchor: ReadingClockAnchor = signed ? { serverNow: signed.serverNow, uptimeMs: sent.uptimeMs, bootId: sent.bootId, nonce, token: signed.token }
        : { serverNow: result.serverNow, uptimeMs: sent.uptimeMs, bootId: sent.bootId };
      await saveJSON(readingClockKey(account), anchor).catch(() => {});
    }
    if (result.supportsAttest && account) void registerAttestKey(account, value ?? '').catch(() => {});
    await saveJSON(cacheKey, result);
    const view = await applyLocalView(result, false);
    const caps = await readingNative.capabilities();
    if (current()) setCapabilities(caps);
    return view;
  }, [challengeId, current, cacheKey, token, applyLocalView, account]);
  const run = useCallback(async (action: () => Promise<unknown>, kind: 'action' | 'refresh' = 'action') => {
    if (!account || !current()) return;
    const operation = Symbol('reading-operation');
    if (kind === 'refresh') {
      // Background work never queues: the running operation or a waiting user action synchronizes anyway.
      if (busyRef.current?.context === context || actionRef.current?.context === context) return;
    } else {
      // One user action at a time, so a repeated «Старт» cannot reserve a second session.
      if (actionRef.current?.context === context) return;
      actionRef.current = { context, operation }; setActionBusy(true);
    }
    try {
      // A user action waits for an in-flight refresh instead of becoming a silent no-op, but never
      // longer than a few seconds: a stalled network must not hold «Старт» or saving pages.
      for (let active = busyRef.current; active?.context === context && active.kind === 'refresh'; active = busyRef.current) {
        let waited!: ReturnType<typeof setTimeout>;
        const timedOut = await Promise.race([active.done.then(() => false),
          new Promise<boolean>(resolve => { waited = setTimeout(() => resolve(true), ACTION_WAIT_MS); })]);
        clearTimeout(waited);
        if (!current()) return;
        if (timedOut) break;
      }
      let finished!: () => void;
      const done = new Promise<void>(resolve => { finished = resolve; });
      busyRef.current = { context, operation, kind, done }; setBusy(true); setError(undefined);
      try { await action(); } catch (e) { if (current()) setError(readingErrorMessage(e)); }
      finally { if (busyRef.current?.operation === operation) busyRef.current = null; finished(); if (current()) setBusy(false); }
    } finally {
      if (actionRef.current?.operation === operation) { actionRef.current = null; if (current()) setActionBusy(false); }
      if (resyncRef.current && current() && busyRef.current?.context !== context && actionRef.current?.context !== context) {
        resyncRef.current = false;
        void run(() => synchronizeRef.current(), 'refresh');
      }
    }
  }, [account, current, context]);
  /** Durable local changes need a server sync; never wait for or drop it behind a stalled refresh. */
  const scheduleSync = useCallback(() => {
    if (busyRef.current?.context === context || actionRef.current?.context === context) { resyncRef.current = true; return; }
    void run(() => synchronizeRef.current(), 'refresh');
  }, [context, run]);
  const clearPendingStart = useCallback(async () => {
    startRecoveryRef.current = null;
    if (current()) setStartRecovery(null);
    await saveJSON(pendingStartKey, null, { strict: true });
  }, [current, pendingStartKey]);
  // Decides whether an earlier start with an unknown outcome can be finished on this phone.
  // Never launches anything itself: only an explicit «Продолжить запуск» starts the timer.
  const reconcilePendingStart = useCallback(async (d: ReadingDetail, local: NativeReadingSession | null) => {
    const checked = d.session?.id ?? null;
    if (startsInFlight.has(pendingStartKey)) return;
    const pending = await loadJSON<ReadingPendingStart | null>(pendingStartKey, null);
    if (!current()) return;
    if (!pending || pending.accountId !== account || pending.challengeId !== challengeId) {
      startRecoveryRef.current = null; setStartRecovery(null); setReconciledFor(checked); return;
    }
    const server = d.session?.id === pending.sessionId ? d.session : null;
    const reserved = !!server && server.status === 'running' && server.deviceId === pending.deviceId
      && server.day === d.currentDay && d.phase === 'active';
    const nativeStarted = local?.accountId === account && local.sessionId === pending.sessionId;
    // Not on the server yet: keep it only while the exact start command still waits to be sent.
    const queued = !server && !nativeStarted
      && (await queue.pending()).commands.some(command => command.operationId === pending.operationId);
    if (!current() || startsInFlight.has(pendingStartKey)) return;
    if (nativeStarted || !reserved && !queued) { await clearPendingStart(); setReconciledFor(checked); return; }
    const offer = reserved && !local ? pending : null;
    startRecoveryRef.current = offer; setStartRecovery(offer); setReconciledFor(checked);
  }, [account, challengeId, current, pendingStartKey, queue, clearPendingStart]);
  const synchronize = useCallback(async (forceActivity = false, deadlineMs?: number): Promise<'online' | 'offline' | undefined> => {
    // Do not create/replace the installation identity during recovery. A
    // missing/unreadable identity cannot prove ownership of a server timer.
    const identity = await readJSON<string>('dvg.readingDevice.v1', '');
    if (!current()) return;
    setDeviceIdentity({ account, id: identity.ok && typeof identity.value === 'string' ? identity.value : null });
    // Restore the last confirmed screen before a network operation: offline users must
    // still be able to pause and durably submit pages after restarting the app.
    if (!dataRef.current) {
      const cached = ReadingDetailSchema.safeParse(await loadJSON(cacheKey, null));
      if (current() && cached.success && cached.data.id === challengeId) await applyLocalView(cached.data, true);
    }
    const refused = await loadJSON<ReadingRejectedApproach[]>(rejectedKey, []);
    if (current()) setRejected(Array.isArray(refused) ? refused : []);
    let initialLocal: NativeReadingSession | null = null;
    let deviceError: unknown;
    try {
      initialLocal = await readingNative.snapshot();
      if (!current()) return;
      observeLocalSession(initialLocal);
      // Reconcile existing cards on foreground/sync, never recreate a dismissed
      // card automatically, and never put ActivityKit on the pause/network path.
      void reconcileLiveActivity(initialLocal, forceActivity);
      const caps = await readingNative.capabilities();
      if (!current()) return;
      setCapabilities(caps);
      setSessionNotice(dataRef.current || initialLocal?.accountId !== account
        ? sessionNoticeFor(initialLocal, account, dataRef.current?.session?.id) : undefined);
    } catch (e) { deviceError = e; }
    if (!current()) return;
    if (initialLocal?.accountId === account && initialLocal.sessionId === dataRef.current?.session?.id) {
      setNativeSession(initialLocal);
      const remaining = await localRemaining(initialLocal);
      if (!current()) return;
      setNativeSession(initialLocal); setRemaining(targetRemaining(dataRef.current, initialLocal, remaining));
    }
    // A pending upload must not hide the current challenge's membership/teams.
    // The queue retains failed evidence; refreshing does not acknowledge it.
    let uploadError: unknown;
    try { await withDeadline(queue.flush(), deadlineMs); } catch (e) { uploadError = e; }
    let result: ReadingDetail | null, stale = false;
    try { result = await refresh(deadlineMs); }
    catch (e) {
      // No internet: keep working from the copy on this phone. Saved approaches stay in the outbox
      // and are delivered by the next synchronization that reaches the server.
      if (!isReadingOffline(e) || !serverDetailRef.current) throw e;
      result = await applyLocalView(serverDetailRef.current, true); stale = true;
    }
    if (!result || !current()) return;
    // Local storage/protection failures are actionable, but cannot hide teams,
    // membership or captain decisions fetched successfully from the server.
    if (deviceError) throw deviceError;
    let local = await readingNative.snapshot();
    if (!current()) return;
    // A timer whose start, time or pages the server definitively refused (possibly while it was being
    // launched) can never be credited: release it so the next approach can start. The refusal stays visible.
    if (local?.accountId === account) {
      const refusedNow = await loadJSON<ReadingRejectedApproach[]>(rejectedKey, []);
      if (Array.isArray(refusedNow) && refusedNow.some(r => r.sessionId === local!.sessionId)) {
        if (current()) setRejected(refusedNow);
        if (local.status === 'running') await readingNative.pause();
        await readingNative.acknowledge(account, local.sessionId);
        local = await readingNative.snapshot();
        if (!current()) return;
      }
    }
    observeLocalSession(local);
    if (!stale && serverDetailRef.current) await reconcilePendingStart(serverDetailRef.current, local);
    else if (stale && !local) {
      // Offline: an approach queued on this phone whose timer never started (e.g. the app was closed
      // between the two steps) can still be continued with the same session.
      const pending = await loadJSON<ReadingPendingStart | null>(pendingStartKey, null);
      if (pending && pending.accountId === account && result.session?.id === pending.sessionId && !startsInFlight.has(pendingStartKey)) {
        startRecoveryRef.current = pending; setStartRecovery(pending); setReconciledFor(pending.sessionId);
      }
    }
    if (!current()) return;
    // Stop and pages of this approach are durably in the outbox: the phone's journal is no longer
    // the only evidence, so release it and allow the next approach even before delivery.
    let savedLocally = false;
    if (local?.accountId === account && isTerminalSession(local)) {
      try { savedLocally = localApproaches((await queue.pending()).commands, challengeId, serverDetailRef.current)
        .some(a => a.sessionId === local.sessionId && a.phase === 'saved'); } catch { savedLocally = false; }
    }
    if (local?.sessionId !== initialLocal?.sessionId || local?.status !== initialLocal?.status) void reconcileLiveActivity(local);
    if (local?.accountId === account && isTerminalSession(local) && (savedLocally || result.reportedSessionIds.includes(local.sessionId))) {
      await readingNative.acknowledge(account, local.sessionId);
      if (!current()) return;
      setNativeSession(null); setSessionNotice(undefined);
      setRemaining(3_600_000 - (result.me?.history.find(day => day.day === result.currentDay)?.elapsedMs ?? 0));
    } else if (local?.accountId === account && result.session && local.sessionId === result.session.id) {
      setSessionNotice(undefined);
      setNativeSession(local);
      const remaining = await localRemaining(local);
      if (!current()) return;
      setRemaining(targetRemaining(result, local, remaining));
      // Decide on the server's own state, not on the phone view: a stop that is only queued
      // still has to be delivered. An approach unknown to the server gets its stop queued too.
      const rawSession = serverDetailRef.current?.session?.id === local.sessionId ? serverDetailRef.current.session : null;
      if (isTerminalSession(local) && (rawSession ? rawSession.status === 'running' : result.session.status === 'running')) {
        await queue.enqueue({ action: 'stop', operationId: await readingOperationId(local.sessionId, 'stop'),
          challengeId, sessionId: local.sessionId, deviceId: local.deviceId, elapsedMs: local.elapsedMs ?? 0, integrity: local.integrity });
        if (stale && serverDetailRef.current) await applyLocalView(serverDetailRef.current, true);
        else {
          await withDeadline(queue.flush(), deadlineMs);
          // Do not leave a transport warning behind after the same synchronization
          // successfully drained every pending command. Keep definitive rejections.
          if (!(uploadError instanceof ReadingApiError) || uploadError.status >= 500) uploadError = undefined;
          await refresh(deadlineMs);
        }
      }
    } else {
      setNativeSession(null);
      setSessionNotice(sessionNoticeFor(local, account, result.session?.id));
    }
    // Offline is shown as a calm status, not as an error; refusals are still errors.
    if (uploadError && !(stale && isReadingOffline(uploadError))) throw uploadError;
    return stale ? 'offline' : 'online';
  }, [queue, refresh, current, account, challengeId, cacheKey, observeLocalSession, reconcileLiveActivity, reconcilePendingStart,
    applyLocalView, rejectedKey, pendingStartKey]);
  synchronizeRef.current = () => synchronize(false, REFRESH_DEADLINE_MS);
  useEffect(() => {
    mounted.current = true;
    setData(null); dataRef.current = null; setNativeSession(null); setLocalPauseAccount(null); setRemaining(3_600_000); setBusy(false); setError(undefined); setSessionNotice(undefined);
    setActionBusy(false); setStartRecovery(null); startRecoveryRef.current = null; setReconciledFor(undefined);
    serverDetailRef.current = null; staleRef.current = false; setOffline(false); setLocalCounts({ pending: 0, pendingToday: 0 }); setRejected([]);
    setDeviceIdentity(undefined);
    setSavingPages(false); setControllingTimer(false); terminalSync.current = undefined;
    ownedRunning.current = null; liveActivityRequest.current += 1; lastReconcile.current = null; setLiveActivity(null); setLiveActivityBusy(false);
    void run(() => synchronize(false, REFRESH_DEADLINE_MS), 'refresh');
    const subscription = AppState.addEventListener('change', s => {
      if (s !== 'active') return;
      // A stalled API operation must not hide a paused timer or dismissed card.
      // Normal synchronization already performs this local-only reconciliation.
      if (busyRef.current?.context === context) void refreshLocalSession();
      else void run(() => synchronize(true, REFRESH_DEADLINE_MS), 'refresh');
    });
    const retry = setInterval(() => { if (AppState.currentState === 'active') void run(() => synchronize(false, REFRESH_DEADLINE_MS), 'refresh'); }, 30_000);
    return () => { mounted.current = false; subscription.remove(); clearInterval(retry); };
  }, [run, synchronize, context, refreshLocalSession]);
  useEffect(() => {
    let alive = true, polling = false;
    const tick = async () => {
      if (polling || !current() || AppState.currentState !== 'active') return;
      polling = true;
      try {
        const local = await readingNative.snapshot();
        if (!alive || !current()) return;
        observeLocalSession(local);
        if (local?.accountId === account && local.sessionId === dataRef.current?.session?.id) {
          setNativeSession(local);
          const remaining = await localRemaining(local);
          if (!alive || !current()) return;
          setNativeSession(local); setRemaining(targetRemaining(dataRef.current, local, remaining));
          if (isTerminalSession(local) && dataRef.current?.session?.status === 'running') {
            const key = `${local.sessionId}:${local.generation ?? ''}:${local.elapsedMs}:${local.integrity}`;
            // One immediate attempt per terminal transition. Network failures
            // retry on the 30-second sync/foreground path, never every clock tick.
            if (terminalSync.current !== key && busyRef.current?.context !== context) {
              terminalSync.current = key; void run(() => synchronize(false, REFRESH_DEADLINE_MS), 'refresh');
            }
          }
        } else if (!local) {
          setNativeSession(null); setSessionNotice(undefined);
          const d = dataRef.current;
          setRemaining(3_600_000 - (d?.me?.history.find(h => h.day === d.currentDay)?.elapsedMs ?? 0));
        }
      } catch (e) { if (alive && current()) setError(readingErrorMessage(e)); }
      finally { polling = false; }
    };
    void tick(); const timer = setInterval(() => { void tick(); }, 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [account, context, current, run, synchronize, observeLocalSession]);

  const command = (body: Omit<ReadingCommand, 'operationId'>) => run(async () => {
    await queue.enqueue({ ...body, action: String(body.action), operationId: Crypto.randomUUID() });
    await synchronize();
  });
  // Normal pause targets this challenge. Emergency pause needs only verified
  // ownership of the device's running session, never a network response.
  const pauseLocal = async (allowUnmatched: boolean) => {
    try {
      if (!current() || allowUnmatched && localPauseAccount !== account) return;
      // A newer pause wins over a resume still waiting on local storage or a
      // delayed native response. Pausing must never wait for this control.
      timerControlRequest.current = null;
      setControllingTimer(false);
      let beforePause: NativeReadingSession | null = null;
      let snapshotError: unknown;
      try { beforePause = await readingNative.snapshot(); } catch (e) { snapshotError = e; }
      if (!current()) return;
      if (beforePause) {
        observeLocalSession(beforePause);
        if (beforePause.accountId !== account || !allowUnmatched && beforePause.sessionId !== dataRef.current?.session?.id) return;
      }
      // Native pause releases protection before touching its journal. It must
      // still run after an unreadable snapshot; no elapsed time is synthesized.
      const local = await readingNative.pause();
      if (!current()) return;
      observeLocalSession(local);
      const notice = sessionNoticeFor(local, account, dataRef.current?.session?.id);
      if (notice) {
        setNativeSession(null);
        // Without detail, we cannot claim that our own session belongs to a
        // different challenge. Keep its journal without submitting/acknowledging.
        setSessionNotice(dataRef.current || local?.accountId !== account ? notice : undefined);
        return;
      }
      setNativeSession(local); setSessionNotice(undefined);
      if (local?.status === 'paused' && local.elapsedMs != null)
        setRemaining(targetRemaining(dataRef.current, local, Math.max(0, local.budgetMs - local.elapsedMs)));
      if (local) void run(() => synchronize(false, REFRESH_DEADLINE_MS), 'refresh');
      else if (snapshotError) setError(readingErrorMessage(snapshotError));
    } catch (e) { if (current()) setError(readingErrorMessage(e)); }
  };
  const restoreLiveActivity = async () => {
    if (!current() || restoreRequest.current?.context === context || !liveActivity?.status.canRestore
      || liveActivity.accountId !== account || ownedRunning.current?.accountId !== account
      || ownedRunning.current.sessionId !== liveActivity.sessionId) return;
    const operation = Symbol('restore-reading-card');
    restoreRequest.current = { context, operation }; setLiveActivityBusy(true);
    const request = ++liveActivityRequest.current;
    try {
      const local = await readingNative.snapshot();
      if (!current()) return;
      observeLocalSession(local);
      if (!local || local.accountId !== account || local.status !== 'running' || local.sessionId !== liveActivity.sessionId) return;
      // Only this explicit action may request a replacement. It does not start
      // protection, credit time, enqueue commands or acknowledge local evidence.
      const status = await readingNative.restoreLiveActivity(account, local.sessionId);
      if (current() && request === liveActivityRequest.current && ownedRunning.current?.sessionId === local.sessionId)
        setLiveActivity({ accountId: account, sessionId: local.sessionId, status });
    } catch {
      if (current() && request === liveActivityRequest.current && ownedRunning.current?.sessionId === liveActivity.sessionId)
        setLiveActivity({ ...liveActivity, status: { state: 'error', canRestore: true } });
    } finally {
      if (restoreRequest.current?.operation === operation) restoreRequest.current = null;
      if (current()) setLiveActivityBusy(false);
    }
  };
  // A page-save caller persists the report itself before scheduling any sync.
  const controlResumableSession = async (action: 'resume' | 'finish', syncAfterFinish = true) => {
    if (!current() || timerControlRequest.current?.context === context) return;
    const operation = Symbol('reading-timer-control');
    timerControlRequest.current = { context, operation }; setControllingTimer(true);
    const controlCurrent = () => current() && timerControlRequest.current?.operation === operation;
    try {
      const local = await readingNative.snapshot();
      if (!controlCurrent()) return;
      if (!local || local.accountId !== account || local.sessionId !== dataRef.current?.session?.id || local.resumeVersion !== 1) return;
      if (!local.generation) throw new Error('Не удалось проверить состояние подхода. Обновите экран.');
      if (dataRef.current.session.status === 'awaiting_pages') throw new Error('Этот подход уже завершён. Сохраните страницы перед новым чтением.');
      if (action === 'resume' && (!isSoftPause(local) || !local.canResume || local.integrity !== 'ok')) return;
      // Read the durable queue without joining its network flush. A close
      // already in flight is still irreversible, including unknown receipts.
      const queued = await readJSON<ReadingQueue | null>(READING_OUTBOX_KEY, null);
      if (!controlCurrent()) return;
      if (!queued.ok) throw new Error('Не удалось проверить сохранённые действия. Повторите попытку.');
      if (hasPendingReadingClose(queued.value, account, local.sessionId))
        throw new Error('Этот подход уже завершён. Дождитесь сохранения страниц перед новым чтением.');
      // Native ownership/generation/deadline checks are authoritative. Finish
      // seals this book's approach, even before the daily goal. Only accumulated
      // server-confirmed time can complete the day; finishing never adds time.
      // Seal before any immutable stop can enter the outbox.
      await readingNative[action](account, local.sessionId, local.generation);
      if (!controlCurrent()) return;
      // A lock-screen action may have run while ActivityKit was updating.
      // Read the journal again instead of reviving a captured running response.
      const changed = await readingNative.snapshot();
      if (!controlCurrent()) return;
      if (!changed || changed.accountId !== account || changed.sessionId !== local.sessionId) throw new Error('Сеанс изменился. Обновите экран.');
      observeLocalSession(changed); setNativeSession(changed); setSessionNotice(undefined); setError(undefined);
      const remaining = await localRemaining(changed);
      if (!controlCurrent()) return;
      setRemaining(targetRemaining(dataRef.current, changed, remaining));
      void reconcileLiveActivity(changed, true);
      if (isTerminalSession(changed) && syncAfterFinish) void run(() => synchronize(false, REFRESH_DEADLINE_MS), 'refresh');
    } catch (e) { if (controlCurrent()) setError(readingErrorMessage(e)); }
    finally {
      if (timerControlRequest.current?.operation === operation) {
        timerControlRequest.current = null;
        if (current()) setControllingTimer(false);
      }
    }
  };
  const persistReport = async (pages: number, nextPage: number | undefined, expectedSessionId: string | undefined) => {
    validatePageReport(pages, nextPage);
    const local = await readingNative.snapshot();
    if (!current()) return;
    const server = dataRef.current?.session;
    if (!expectedSessionId || server?.id !== expectedSessionId) throw new Error('Сеанс изменился. Обновите экран перед сохранением страниц.');
    const ownLocal = local?.accountId === account && local.sessionId === server?.id ? local : null;
    if (ownLocal?.resumeVersion === 1 && ownLocal.terminal !== true) throw new Error('Сначала завершите чтение. На паузе страницы не отправляются.');
    const sessionId = ownLocal && isTerminalSession(ownLocal) && ownLocal.sessionId === server?.id ? ownLocal.sessionId : server?.status === 'awaiting_pages' ? server.id : null;
    if (!sessionId) throw new Error('Сначала остановите таймер');
    const commands: ReadingCommand[] = [];
    if (ownLocal && isTerminalSession(ownLocal) && ownLocal.sessionId === sessionId
      && !(ownLocal.resumeVersion === 1 && server?.status === 'awaiting_pages')) {
      commands.push({ action: 'stop', operationId: await readingOperationId(sessionId, 'stop'),
        challengeId, sessionId, deviceId: ownLocal.deviceId, elapsedMs: ownLocal.elapsedMs ?? 0, integrity: ownLocal.integrity });
    }
    commands.push({ action: 'report', operationId: await readingOperationId(sessionId, 'report'), challengeId, sessionId, pages, ...(nextPage !== undefined ? { nextPage } : {}) });
    // One durable write for both commands, independent of a stalled upload.
    await queue.enqueueMany(commands);
    // The approach is saved on the phone now: show it at once, release the journal on the next sync.
    if (serverDetailRef.current) await applyLocalView(serverDetailRef.current, staleRef.current);
    scheduleSync();
  };
  const savePages = async (action: () => Promise<void>) => {
    if (!account || !current() || pageSaveRequest.current?.context === context) return;
    const operation = Symbol('save-reading-pages');
    pageSaveRequest.current = { context, operation }; setSavingPages(true); setError(undefined);
    try { await action(); }
    catch (e) { if (current()) setError(readingErrorMessage(e)); }
    finally {
      if (pageSaveRequest.current?.operation === operation) pageSaveRequest.current = null;
      if (current()) setSavingPages(false);
    }
  };
  const report = (pages: number, nextPage?: number) => savePages(() => persistReport(pages, nextPage, dataRef.current?.session?.id));
  /** Сохраняем отдельный подход к книге: сначала закрываем его на телефоне (finish), затем отправляем страницы.
   * Дневная цель складывается из подтверждённого времени всех подходов; обычная пауза ничего не закрывает.
   * Если закрыть не удалось, ошибка уже показана и страницы не уходят. */
  const saveApproach = (pages: number, nextPage?: number) => savePages(async () => {
    validatePageReport(pages, nextPage);
    const expectedSessionId = dataRef.current?.session?.id;
    const local = await readingNative.snapshot();
    if (!current()) return;
    if (local?.accountId === account && local.sessionId === dataRef.current?.session?.id && local.resumeVersion === 1 && local.terminal !== true) {
      await controlResumableSession('finish', false);
      const closed = await readingNative.snapshot();
      if (!current() || closed?.sessionId !== local.sessionId || closed.terminal !== true) return;
    }
    await persistReport(pages, nextPage, expectedSessionId);
  });
  // Launches the native timer for a server-confirmed reservation made by THIS phone.
  // A bridge error is not proof that the native start failed: its journal may already
  // run. Only a confirmed absent journal cancels the reservation, with zero credit.
  const launchNative = async (pending: ReadingPendingStart, d: ReadingDetail) => {
    const session = d.session;
    if (session?.id !== pending.sessionId || session.status !== 'running') throw new Error('Сервер не подтвердил начало');
    try {
      // «Старт» in the last minute of a day is placed by the server on the next day (counts from 00:00).
      if (session.day !== d.currentDay && session.day !== d.currentDay + 1 || d.phase !== 'active') throw new Error('День завершился. Обновите экран перед новым подходом.');
      await saveJSON(cacheKey, d, { strict: true });
      const targetMs = 3_600_000 - (d.me?.history.find(h => h.day === session.day)?.elapsedMs ?? 0);
      // Conservative deadline: network/cache latency must never move the stop past midnight.
      const untilMidnight = Math.floor(readingDayEnd(d.startDate, session.day) - d.serverNow - (performance.now() - requestStartedAt.current));
      if (untilMidnight <= 0) throw new Error('День завершился. Обновите экран перед новым подходом.');
      if (!current()) return;
      const local = await readingNative.start(account, pending.sessionId, pending.deviceId, pending.book, Math.min(session.budgetMs, untilMidnight), targetMs);
      // The native journal is now the evidence; a failed cleanup must not close a running timer.
      await clearPendingStart().catch(() => {});
      if (current()) { setNativeSession(local); observeLocalSession(local); setRemaining(targetMs); void reconcileLiveActivity(local); }
    } catch (e) {
      const recorded = await readingNative.snapshot(); // If unreadable, preserve the reservation too.
      if (!current()) return;
      if (recorded) {
        if (recorded.accountId === account && recorded.sessionId === pending.sessionId) {
          await clearPendingStart().catch(() => {});
          observeLocalSession(recorded); setNativeSession(recorded);
          const remaining = await localRemaining(recorded);
          if (current()) setRemaining(targetRemaining(d, recorded, remaining));
        }
        throw e;
      }
      await queue.enqueueMany([
        { action: 'stop', operationId: await readingOperationId(pending.sessionId, 'stop'), challengeId,
          sessionId: pending.sessionId, deviceId: pending.deviceId, elapsedMs: 0, integrity: 'ok' },
        { action: 'report', operationId: await readingOperationId(pending.sessionId, 'report'), challengeId, sessionId: pending.sessionId, pages: 0 },
      ]);
      await clearPendingStart().catch(() => {});
      await synchronize();
      throw e;
    }
  };
  // Starts the timer on the phone without a server answer. The queued start (with the phone time) is
  // delivered later; until then the approach lives in the outbox and is shown from it.
  const launchOffline = async (pending: ReadingPendingStart) => {
    const raw = serverDetailRef.current;
    if (!raw) throw new Error('На телефоне нет данных челленджа. Один раз откройте его с интернетом.');
    const view = await applyLocalView(raw, true);
    const session = view.session;
    if (session?.id !== pending.sessionId) throw new Error('Не удалось начать подход на телефоне. Повторите.');
    try {
      const untilMidnight = readingDayEnd(view.startDate, session.day) - (await readingPhoneNow(account)).now;
      if (untilMidnight <= 0) throw new Error('День завершился. Начните новый подход.');
      const targetMs = 3_600_000 - (view.me?.history.find(h => h.day === session.day)?.elapsedMs ?? 0);
      if (!current()) return;
      const local = await readingNative.start(account, pending.sessionId, pending.deviceId, pending.book, Math.min(session.budgetMs, untilMidnight), targetMs);
      await clearPendingStart().catch(() => {});
      if (current()) { setNativeSession(local); observeLocalSession(local); setRemaining(targetMs); void reconcileLiveActivity(local); }
    } catch (e) {
      let recorded: NativeReadingSession | null | undefined;
      try { recorded = await readingNative.snapshot(); } catch { recorded = undefined; }
      if (!current()) return;
      // A journal that may exist keeps its time; only a confirmed absent journal closes the start with zero.
      if (recorded !== null) {
        if (recorded?.accountId === account && recorded.sessionId === pending.sessionId) {
          await clearPendingStart().catch(() => {});
          observeLocalSession(recorded); setNativeSession(recorded);
        }
        throw e;
      }
      await queue.enqueueMany([
        { action: 'stop', operationId: await readingOperationId(pending.sessionId, 'stop'), challengeId,
          sessionId: pending.sessionId, deviceId: pending.deviceId, elapsedMs: 0, integrity: 'ok' },
        { action: 'report', operationId: await readingOperationId(pending.sessionId, 'report'), challengeId, sessionId: pending.sessionId, pages: 0 },
      ]);
      await clearPendingStart().catch(() => {});
      await applyLocalView(raw, true);
      throw e;
    }
  };
  const resumableSession = nativeSession?.accountId === account && nativeSession.resumeVersion === 1;
  const remoteRunning = !nativeSession && data?.session?.status === 'running'
    && deviceIdentity?.account === account && (!deviceIdentity.id || deviceIdentity.id !== data.session.deviceId);
  const visibleSessionNotice: ReadingSessionNotice | undefined = sessionNotice ?? (remoteRunning ? {
    kind: 'other-device',
    message: deviceIdentity?.id
      ? 'Чтение идёт на другом устройстве. Продолжите или завершите подход на том iPhone или iPad, где запустили таймер, и сохраните страницы. После этого результат появится здесь. Таймер не сброшен.'
      : 'На сервере есть начатый подход, но принадлежность таймера этому устройству не подтверждена. Откройте Divergents на устройстве, где начали чтение, и сохраните страницы. Сохранённые результаты не удалены.',
  } : undefined);
  // Pages belong to one exact approach, not the daily countdown. Prefer its
  // frozen native evidence, never elapsed time from another account/challenge.
  const ownServerSession = data?.id === challengeId && data.me?.userId === account ? data.session : null;
  const sessionElapsedMs = ownServerSession && nativeSession?.accountId === account
    && nativeSession.sessionId === ownServerSession.id && nativeSession.status === 'paused'
    && nativeSession.elapsedMs != null ? nativeSession.elapsedMs : ownServerSession?.elapsedMs ?? undefined;
  useEffect(() => {
    if (!account || !current() || nativeSession?.accountId !== account || nativeSession.sessionId !== ownServerSession?.id) return;
    // Native journal transitions handle background / lock-screen rescheduling.
    // Never make timer controls wait for notification permission or delivery.
    void readingNative.configurePageReminder?.(account, nativeSession.sessionId, challengeId).catch(() => {});
  }, [account, challengeId, current, nativeSession?.accountId, nativeSession?.sessionId, ownServerSession?.id]);
  return { data, remainingMs, sessionElapsedMs, busy: busy || savingPages, localBusy: savingPages || controllingTimer,
    error, sessionNotice: visibleSessionNotice,
    startBlocked: !!visibleSessionNotice || !!nativeSession || !!data?.session,
    canPauseLocally: !!account && localPauseAccount === account,
    pauseLocally: () => pauseLocal(true),
    liveActivityStatus: localPauseAccount === account && liveActivity?.accountId === account ? liveActivity.status : null,
    liveActivityBusy, restoreLiveActivity,
    supportsResume: capabilities.supportsResume === true,
    resumableSession,
    canResume: !!resumableSession && isSoftPause(nativeSession) && nativeSession?.canResume === true
      && !!nativeSession.generation && nativeSession.integrity === 'ok'
      && data?.session?.id === nativeSession.sessionId && data.session.status === 'running',
    resume: () => controlResumableSession('resume'),
    finish: () => controlResumableSession('finish'),
    blockingMode: nativeSession ? nativeSession.blockingMode ?? 'selected' : capabilities.blockingMode,
    protection: !capabilities.available ? 'unavailable' as const : !capabilities.authorized ? 'permission' as const
      : capabilities.blockingMode !== 'all-apps' && !capabilities.selectedCount ? 'selection' as const : 'ready' as const,
    timerState: nativeSession?.status === 'running' ? 'running' as const : nativeSession?.status === 'paused' ? 'paused' as const
      : data?.me?.history.find(h => h.day === data.currentDay)?.state === 'complete' ? 'complete' as const
      : nativeSession || data?.session ? 'paused' as const : 'ready' as const,
    awaitingPages: isTerminalSession(nativeSession) || data?.session?.status === 'awaiting_pages',
    needsRecovery: !!data?.session && data.session.status === 'running' && !nativeSession && !visibleSessionNotice && !startRecovery
      && reconciledFor === data.session.id
      && deviceIdentity?.account === account && !!deviceIdentity.id && deviceIdentity.id === data.session.deviceId,
    /** The server reserved this phone's start, but the response was lost before the timer began. */
    startRecovery: !!startRecovery && data?.session?.id === startRecovery.sessionId && !nativeSession && !visibleSessionNotice,
    actionBusy,
    /** No fresh server answer: the screen works from the phone copy. */
    offline,
    /** Approaches saved on this phone that the server has not received yet. */
    pendingApproaches: localCounts.pending, pendingToday: localCounts.pendingToday,
    /** Approaches started without internet that the server later refused. */
    rejectedApproaches: rejected,
    dismissRejected: async () => { await saveJSON(rejectedKey, [], { strict: true }).catch(() => {}); if (current()) setRejected([]); },
    retry: () => run(() => synchronize(true, REFRESH_DEADLINE_MS), 'refresh'),
    prepare: () => run(async () => { const c = await readingNative.capabilities();
      if (!c.authorized) await readingNative.authorize();
      else if (c.blockingMode !== 'all-apps') await readingNative.selectApps();
      if (current()) setCapabilities(await readingNative.capabilities());
    }),
    start: (book: string, metadata?: ReadingBookMetadata) => run(async () => {
      // A slow network must not hold «Старт»: after a few seconds continue from the phone copy.
      const offlineCapable = () => !!serverDetailRef.current?.supportsOfflineStart;
      const mode = await synchronize(false, 6000);
      if (!current()) return;
      if (mode === 'offline' && !offlineCapable()) throw new Error('Нет интернета. Запуск без сети станет доступен после обновления сервера.');
      const local = await readingNative.snapshot();
      if (!current()) return;
      if (local) throw new Error(sessionNoticeFor(local, account, dataRef.current?.session?.id)?.message ?? 'Сначала сохраните страницы предыдущего подхода');
      if (startRecoveryRef.current) throw new Error('Подход уже начат на сервере с этого телефона. Нажмите «Продолжить запуск».');
      if (dataRef.current?.session) throw new Error(dataRef.current.session.status === 'awaiting_pages'
        ? 'Сначала сохраните страницы предыдущего подхода' : visibleSessionNotice?.message ?? 'Сначала восстановите предыдущий сеанс и сохраните страницы');
      if (await loadJSON<ReadingPendingStart | null>(pendingStartKey, null)) throw new Error('Предыдущий запуск ещё ждёт ответа сервера. Повторите через минуту.');
      const c = await readingNative.capabilities();
      if (!c.available || !c.authorized || c.blockingMode !== 'all-apps' && !c.selectedCount) throw new Error('Сначала подключите блокировку приложений');
      const deviceId = await loadJSON<string>('dvg.readingDevice.v1', '') || Crypto.randomUUID();
      await saveJSON('dvg.readingDevice.v1', deviceId, { strict: true });
      if (startsInFlight.has(pendingStartKey)) throw new Error('Запуск уже выполняется на другом экране.');
      const sessionId = Crypto.randomUUID();
      // Measured from the last server time + monotonic clock when possible: a changed phone date
      // cannot move the approach to another day (the server accepts a bare phone date for today only).
      const placed = await readingPhoneNow(account);
      // Signed by a genuine copy of this app (App Attest, works offline): the server may then place it on a past day.
      const timing = placed.source === 'synced' ? { startedAt: placed.now, startedAtSource: placed.source, syncedAt: placed.syncedAt,
        ...(placed.syncNonce ? { syncNonce: placed.syncNonce, syncToken: placed.syncToken } : {}) }
        : { startedAt: placed.now, startedAtSource: placed.source };
      const attestKey = offlineCapable() ? await loadJSON<{ keyId: string } | null>(readingAttestKey(account), null).catch(() => null) : null;
      const assertion = attestKey?.keyId ? await readingNative.attest?.assertion(attestKey.keyId,
        readingStartClientData({ sessionId, ...timing })) : null;
      const pending: ReadingPendingStart = { accountId: account, challengeId, sessionId, deviceId,
        operationId: await readingOperationId(sessionId, 'start'), book, createdAt: Date.now() };
      // Remember the attempt BEFORE the request: a lost response is finished later with
      // this same session instead of a second reservation.
      startsInFlight.add(pendingStartKey);
      let d: ReadingDetail | null = null, offlineStart = mode === 'offline';
      try {
        await saveJSON(pendingStartKey, pending, { strict: true });
        // The phone time travels with the start, so a late delivery lands on the right day.
        await queue.enqueue({ action: 'start', operationId: pending.operationId, challengeId, sessionId, deviceId, book, ...metadata,
          ...(offlineCapable() ? { ...timing, ...(assertion && attestKey ? { attestKeyId: attestKey.keyId, assertion } : {}) } : {}) });
        if (!offlineStart) {
          try {
            await withDeadline(queue.flush(), 8000);
            d = await refresh(8000);
          } catch (e) {
            if (!offlineCapable() || !isReadingOffline(e)) throw e;
            offlineStart = true;
          }
        }
      } finally { startsInFlight.delete(pendingStartKey); }
      if (!current()) return;
      if (offlineStart) { await launchOffline(pending); return; }
      if (!d) return;
      if (d.session?.id !== sessionId) throw new Error('Сервер не подтвердил начало');
      await launchNative(pending, d);
    }),
    /** Finishes a start whose server reservation is confirmed but whose response was lost.
     * Only by explicit user action, only on the phone that reserved it, same session id. */
    continueStart: () => run(async () => {
      const mode = await synchronize(false, 6000);
      if (!current()) return;
      const pending = startRecoveryRef.current, d = dataRef.current;
      if (!pending || !d) throw new Error('Начатого подхода для продолжения нет. Обновите экран.');
      const local = await readingNative.snapshot();
      if (!current()) return;
      if (local) throw new Error(sessionNoticeFor(local, account, d.session?.id)?.message ?? 'На телефоне уже есть подход. Сначала сохраните его страницы.');
      const deviceId = await loadJSON<string>('dvg.readingDevice.v1', '');
      if (deviceId !== pending.deviceId) throw new Error('Этот сеанс начат на другом устройстве. Откройте Divergents на нём.');
      const c = await readingNative.capabilities();
      if (!c.available || !c.authorized || c.blockingMode !== 'all-apps' && !c.selectedCount) throw new Error('Сначала подключите блокировку приложений');
      if (mode === 'offline') await launchOffline(pending); else await launchNative(pending, d);
    }),
    // Pausing never waits on network or a busy API operation.
    pause: () => pauseLocal(false),
    report,
    saveApproach,
    recover: () => run(async () => {
      const expectedSessionId = dataRef.current?.session?.id;
      const local = await readingNative.snapshot();
      if (local) throw new Error('На телефоне есть сохранённое время. Сначала синхронизируйте его, не сбрасывая сеанс.');
      const d = await refresh();
      const session = d?.session;
      const identity = await readJSON<string>('dvg.readingDevice.v1', '');
      const deviceId = identity.ok ? identity.value : null;
      if (!current()) return;
      if (!session || session.deviceId !== deviceId) throw new Error('Этот сеанс начат на другом устройстве. Откройте Divergents на нём.');
      if (session.id !== expectedSessionId) throw new Error('Сеанс изменился. Обновите экран.');
      if (session.status !== 'running') throw new Error('Чтение уже завершено. Сохраните страницы этого подхода.');
      // Refresh may have waited on the network while the native journal changed.
      if (await readingNative.snapshot()) throw new Error('На телефоне есть сохранённое время. Сначала синхронизируйте его, не сбрасывая сеанс.');
      await queue.enqueueMany([
        { action: 'stop', operationId: await readingOperationId(session.id, 'stop'), challengeId, sessionId: session.id, deviceId, elapsedMs: 0, integrity: 'ok' },
        { action: 'report', operationId: await readingOperationId(session.id, 'report'), challengeId, sessionId: session.id, pages: 0 },
      ]);
      await synchronize();
    }),
    // Индивидуальный зачёт: согласие с правилами — и человек сразу участник, без команды и модерации.
    join: () => command({ action: 'join', challengeId, acceptRules: true }),
  };
}
