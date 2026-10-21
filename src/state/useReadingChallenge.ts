import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';
import { fetchReadingDetail, ReadingApiError, ReadingCommand, ReadingDetail, ReadingDetailSchema, sendReadingCommand } from '../data/reading';
import { loadJSON, readJSON, saveJSON } from './persist';
import { readingNative, NativeReadingSession, ReadingCapabilities, ReadingLiveActivityStatus, isLegacyReadingQASession } from './readingNative';
import { ReadingOutbox, ReadingQueue, READING_OUTBOX_KEY, readingErrorMessage, hasPendingReadingClose } from './readingOutbox';
import { ReadingBookMetadata } from '../data/readingBooks';

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
export type ReadingSessionNotice = { kind: 'test-running' | 'other-account' | 'other-challenge'; message: string };
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
  const [remainingMs, setRemaining] = useState(3_600_000);
  const [capabilities, setCapabilities] = useState<ReadingCapabilities>({ available: false, authorized: false, selectedCount: 0, platform: '', blockingMode: 'selected' });
  const [error, setError] = useState<string>();
  const [sessionNotice, setSessionNotice] = useState<ReadingSessionNotice>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef<{ context: symbol; operation: symbol } | null>(null), mounted = useRef(true);
  const dataRef = useRef(data); dataRef.current = data;
  const requestStartedAt = useRef(0);
  const account = userId ?? '';
  const cacheKey = `dvg.readingDetail.${account}.${challengeId}`;
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
  const queue = useMemo(() => new ReadingOutbox(account, {
    read: async () => { const r = await readJSON<ReadingQueue | null>(READING_OUTBOX_KEY, null); if (!r.ok) throw new Error('Не удалось прочитать сохранённые действия'); return r.value; },
    write: q => saveJSON(READING_OUTBOX_KEY, q, { strict: true }),
    isCurrentAccount: current,
    send: async command => {
      const token = await authRef.current.getToken();
      if (!current()) throw new Error('Аккаунт изменился');
      return sendReadingCommand(token, command);
    },
  }), [account, current]);
  const refresh = useCallback(async () => {
    const startedAt = performance.now();
    const token = await authRef.current.getToken();
    if (!current()) return null;
    const result = await fetchReadingDetail(token, challengeId);
    if (!current()) return null;
    if (result.id !== challengeId) throw new Error('Сервер вернул другой челлендж. Повторите обновление.');
    requestStartedAt.current = startedAt;
    setData(result); dataRef.current = result;
    await saveJSON(cacheKey, result);
    const caps = await readingNative.capabilities();
    if (current()) setCapabilities(caps);
    return result;
  }, [challengeId, current, cacheKey]);
  const run = useCallback(async (action: () => Promise<void>) => {
    if (busyRef.current?.context === context || !account || !current()) return;
    const operation = Symbol('reading-operation');
    busyRef.current = { context, operation }; setBusy(true); setError(undefined);
    try { await action(); } catch (e) { if (current()) setError(readingErrorMessage(e)); }
    finally { if (busyRef.current?.operation === operation) busyRef.current = null; if (current()) setBusy(false); }
  }, [account, current, context]);
  const synchronize = useCallback(async (forceActivity = false) => {
    // Restore the last confirmed screen before a network operation: offline users must
    // still be able to pause and durably submit pages after restarting the app.
    if (!dataRef.current) {
      const cached = ReadingDetailSchema.safeParse(await loadJSON(cacheKey, null));
      if (current() && cached.success && cached.data.id === challengeId) {
        setData(cached.data); dataRef.current = cached.data;
      }
    }
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
    try { await queue.flush(); } catch (e) { uploadError = e; }
    const result = await refresh();
    if (!result || !current()) return;
    // Local storage/protection failures are actionable, but cannot hide teams,
    // membership or captain decisions fetched successfully from the server.
    if (deviceError) throw deviceError;
    const local = await readingNative.snapshot();
    if (!current()) return;
    observeLocalSession(local);
    if (local?.sessionId !== initialLocal?.sessionId || local?.status !== initialLocal?.status) void reconcileLiveActivity(local);
    if (local?.accountId === account && isTerminalSession(local) && result.reportedSessionIds.includes(local.sessionId)) {
      await readingNative.acknowledge(account, local.sessionId);
      if (!current()) return;
      setNativeSession(null); setSessionNotice(undefined);
    } else if (local?.accountId === account && result.session && local.sessionId === result.session.id) {
      setSessionNotice(undefined);
      setNativeSession(local);
      const remaining = await localRemaining(local);
      if (!current()) return;
      setRemaining(targetRemaining(result, local, remaining));
      if (isTerminalSession(local) && result.session.status === 'running') {
        await queue.enqueue({ action: 'stop', operationId: await readingOperationId(local.sessionId, 'stop'),
          challengeId, sessionId: local.sessionId, deviceId: local.deviceId, elapsedMs: local.elapsedMs ?? 0, integrity: local.integrity });
        await queue.flush();
        // Do not leave a transport warning behind after the same synchronization
        // successfully drained every pending command. Keep definitive rejections.
        if (!(uploadError instanceof ReadingApiError) || uploadError.status >= 500) uploadError = undefined;
        await refresh();
      }
    } else {
      setNativeSession(null);
      setSessionNotice(sessionNoticeFor(local, account, result.session?.id));
    }
    if (uploadError) throw uploadError;
  }, [queue, refresh, current, account, challengeId, cacheKey, observeLocalSession, reconcileLiveActivity]);
  useEffect(() => {
    mounted.current = true;
    setData(null); dataRef.current = null; setNativeSession(null); setLocalPauseAccount(null); setRemaining(3_600_000); setBusy(false); setError(undefined); setSessionNotice(undefined);
    ownedRunning.current = null; liveActivityRequest.current += 1; lastReconcile.current = null; setLiveActivity(null); setLiveActivityBusy(false);
    void run(synchronize);
    const subscription = AppState.addEventListener('change', s => {
      if (s !== 'active') return;
      // A stalled API operation must not hide a paused timer or dismissed card.
      // Normal synchronization already performs this local-only reconciliation.
      if (busyRef.current?.context === context) void refreshLocalSession();
      else void run(() => synchronize(true));
    });
    const retry = setInterval(() => { if (AppState.currentState === 'active') void run(synchronize); }, 30_000);
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
          if (isTerminalSession(local) && dataRef.current?.session?.status === 'running') void run(synchronize);
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
  }, [account, current, run, synchronize, observeLocalSession]);

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
      if (local) void run(synchronize);
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
  // syncAfterFinish=false: the caller sends the pages itself; a parallel sync would make that send a busy no-op.
  const controlResumableSession = async (action: 'resume' | 'finish', syncAfterFinish = true) => {
    if (!current() || timerControlRequest.current?.context === context) return;
    const operation = Symbol('reading-timer-control');
    timerControlRequest.current = { context, operation };
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
      // A soft pause is not a shortcut around the daily hour. Forced terminal
      // journals (deadline/interruption) still retain their partial evidence.
      if (action === 'finish' && local.terminal !== true) {
        const remaining = await localRemaining(local);
        if (!controlCurrent()) return;
        if (targetRemaining(dataRef.current, local, remaining) > 0) throw new Error('До 60 минут можно поставить паузу и продолжить чтение позже.');
      }
      // Native ownership/generation/deadline checks are authoritative. Finish
      // seals the journal before any immutable stop can enter the outbox.
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
      if (isTerminalSession(changed) && syncAfterFinish) void run(synchronize);
    } catch (e) { if (controlCurrent()) setError(readingErrorMessage(e)); }
    finally { if (timerControlRequest.current?.operation === operation) timerControlRequest.current = null; }
  };
  const report = (pages: number, nextPage?: number) => run(async () => {
    const local = await readingNative.snapshot();
    if (!current()) return;
    const server = dataRef.current?.session;
    const ownLocal = local?.accountId === account ? local : null;
    if (ownLocal?.resumeVersion === 1 && ownLocal.terminal !== true) throw new Error('Сначала завершите чтение. На паузе страницы не отправляются.');
    const sessionId = ownLocal && isTerminalSession(ownLocal) && ownLocal.sessionId === server?.id ? ownLocal.sessionId : server?.status === 'awaiting_pages' ? server.id : null;
    if (!sessionId) throw new Error('Сначала остановите таймер');
    if (ownLocal && isTerminalSession(ownLocal) && ownLocal.sessionId === sessionId
      && !(ownLocal.resumeVersion === 1 && server?.status === 'awaiting_pages')) {
      await queue.enqueue({ action: 'stop', operationId: await readingOperationId(sessionId, 'stop'),
        challengeId, sessionId, deviceId: ownLocal.deviceId, elapsedMs: ownLocal.elapsedMs ?? 0, integrity: ownLocal.integrity });
    }
    // Save pages BEFORE touching the network. Offline reports survive app termination.
    await queue.enqueue({ action: 'report', operationId: await readingOperationId(sessionId, 'report'), challengeId, sessionId, pages, ...(nextPage !== undefined ? { nextPage } : {}) });
    await synchronize();
  });
  /** Страницы после дневной цели: паузу сначала закрываем на телефоне (finish), затем отправляем страницы.
   * Если закрыть не удалось, ошибка уже показана и страницы не уходят. */
  const saveApproach = async (pages: number, nextPage?: number) => {
    const local = await readingNative.snapshot();
    if (!current()) return;
    if (local?.accountId === account && local.resumeVersion === 1 && local.terminal !== true) {
      await controlResumableSession('finish', false);
      const closed = await readingNative.snapshot();
      if (!current() || closed?.sessionId !== local.sessionId || closed.terminal !== true) return;
    }
    await report(pages, nextPage);
  };
  const resumableSession = nativeSession?.accountId === account && nativeSession.resumeVersion === 1;
  return { data, remainingMs, busy, error, sessionNotice, startBlocked: !!sessionNotice,
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
    needsRecovery: !!data?.session && data.session.status === 'running' && !nativeSession && !sessionNotice,
    retry: () => run(() => synchronize(true)),
    prepare: () => run(async () => { const c = await readingNative.capabilities();
      if (!c.authorized) await readingNative.authorize();
      else if (c.blockingMode !== 'all-apps') await readingNative.selectApps();
      if (current()) setCapabilities(await readingNative.capabilities());
    }),
    start: (book: string, metadata?: ReadingBookMetadata) => run(async () => {
      await synchronize();
      if (!current()) return;
      const local = await readingNative.snapshot();
      if (!current()) return;
      if (local) throw new Error(sessionNoticeFor(local, account, dataRef.current?.session?.id)?.message ?? 'Сначала сохраните страницы предыдущего подхода');
      if (dataRef.current?.session) throw new Error('Сначала восстановите предыдущий сеанс и сохраните страницы');
      const c = await readingNative.capabilities();
      if (!c.available || !c.authorized || c.blockingMode !== 'all-apps' && !c.selectedCount) throw new Error('Сначала подключите блокировку приложений');
      const deviceId = await loadJSON<string>('dvg.readingDevice.v1', '') || Crypto.randomUUID();
      await saveJSON('dvg.readingDevice.v1', deviceId, { strict: true });
      const sessionId = Crypto.randomUUID();
      await queue.enqueue({ action: 'start', operationId: await readingOperationId(sessionId, 'start'), challengeId, sessionId, deviceId, book, ...metadata });
      await queue.flush();
      const d = await refresh();
      if (!current() || d?.session?.id !== sessionId) throw new Error('Сервер не подтвердил начало');
      try {
        await saveJSON(cacheKey, d, { strict: true });
        const targetMs = 3_600_000 - (d.me?.history.find(h => h.day === d.currentDay)?.elapsedMs ?? 0);
        // Conservative deadline: network/cache latency must never move the stop past midnight.
        const untilMidnight = Math.floor(d.dayEnd - d.serverNow - (performance.now() - requestStartedAt.current));
        if (untilMidnight <= 0) throw new Error('День завершился. Обновите экран перед новым подходом.');
        if (!current()) return;
        const local = await readingNative.start(account, sessionId, deviceId, book, Math.min(d.session.budgetMs, untilMidnight), targetMs);
        if (current()) { setNativeSession(local); observeLocalSession(local); setRemaining(targetMs); void reconcileLiveActivity(local); }
      } catch (e) {
        // Zero-credit closure if native authorization/storage failed after the server reserved the session.
        await queue.enqueue({ action: 'stop', operationId: await readingOperationId(sessionId, 'stop'), challengeId, sessionId, deviceId, elapsedMs: 0, integrity: 'ok' });
        await queue.enqueue({ action: 'report', operationId: await readingOperationId(sessionId, 'report'), challengeId, sessionId, pages: 0 });
        await synchronize();
        throw e;
      }
    }),
    // Pausing never waits on network or a busy API operation.
    pause: () => pauseLocal(false),
    report,
    saveApproach,
    recover: () => run(async () => {
      const local = await readingNative.snapshot();
      if (local) throw new Error('На телефоне есть сохранённое время. Сначала синхронизируйте его, не сбрасывая сеанс.');
      const d = await refresh();
      const session = d?.session;
      const deviceId = await loadJSON<string>('dvg.readingDevice.v1', '');
      if (!session || session.deviceId !== deviceId) throw new Error('Этот сеанс начат на другом устройстве. Откройте Divergents на нём.');
      if (session.status === 'running') await queue.enqueue({ action: 'stop', operationId: await readingOperationId(session.id, 'stop'),
        challengeId, sessionId: session.id, deviceId, elapsedMs: 0, integrity: 'ok' });
      await queue.enqueue({ action: 'report', operationId: await readingOperationId(session.id, 'report'), challengeId, sessionId: session.id, pages: 0 });
      await synchronize();
    }),
    // Индивидуальный зачёт: согласие с правилами — и человек сразу участник, без команды и модерации.
    join: () => command({ action: 'join', challengeId, acceptRules: true }),
  };
}
