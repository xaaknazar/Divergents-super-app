import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';
import { fetchReadingDetail, ReadingApiError, ReadingCommand, ReadingDetail, ReadingDetailSchema, sendReadingCommand } from '../data/reading';
import { loadJSON, readJSON, saveJSON } from './persist';
import { readingNative, NativeReadingSession, ReadingCapabilities, isLegacyReadingQASession } from './readingNative';
import { ReadingOutbox, ReadingQueue, READING_OUTBOX_KEY, readingErrorMessage } from './readingOutbox';
import { ReadingBookMetadata } from '../data/readingBooks';

// A stable operation id survives app/extension death; retries keep the exact payload.
export async function readingOperationId(sessionId: string, action: string) {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sessionId}:${action}`);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
function targetRemaining(data: ReadingDetail | null, local: NativeReadingSession, remainingBudget: number) {
  const saved = data?.me?.history.find(d => d.day === data.session?.day)?.elapsedMs ?? 0;
  return 3_600_000 - saved - (local.budgetMs - remainingBudget);
}
export type ReadingSessionNotice = { kind: 'test-running' | 'other-account' | 'other-challenge'; message: string };
function sessionNoticeFor(local: NativeReadingSession | null, account: string, sessionId?: string): ReadingSessionNotice | undefined {
  if (!local) return;
  if (isLegacyReadingQASession(local)) return { kind: 'test-running',
    message: 'На телефоне ещё идёт проверочный таймер. Поставьте его на паузу в «Divergents Reading QA» и нажмите «Повторить». Реальные результаты не затронуты.' };
  if (local.accountId !== account) return { kind: 'other-account',
    message: 'Сохранён незавершённый подход другого аккаунта. Команды и заявки доступны. Для нового таймера сначала войдите в прежний аккаунт и сохраните его страницы; затем вернитесь и нажмите «Повторить».' };
  if (local.sessionId !== sessionId) return { kind: 'other-challenge',
    message: 'На телефоне сохранён подход другого челленджа. Откройте тот челлендж и сохраните страницы, затем вернитесь и нажмите «Повторить». Команды и заявки доступны.' };
}
export function useReadingChallenge(challengeId: string) {
  const { userId, getToken } = useAuth();
  const authRef = useRef({ userId, getToken }); authRef.current = { userId, getToken };
  const [data, setData] = useState<ReadingDetail | null>(null);
  const [nativeSession, setNativeSession] = useState<NativeReadingSession | null>(null);
  const [remainingMs, setRemaining] = useState(3_600_000);
  const [capabilities, setCapabilities] = useState<ReadingCapabilities>({ available: false, authorized: false, selectedCount: 0, platform: '' });
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
  const synchronize = useCallback(async () => {
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
      const caps = await readingNative.capabilities();
      if (!current()) return;
      setCapabilities(caps);
      setSessionNotice(sessionNoticeFor(initialLocal, account, dataRef.current?.session?.id));
    } catch (e) { deviceError = e; }
    if (!current()) return;
    if (initialLocal?.accountId === account && initialLocal.sessionId === dataRef.current?.session?.id) {
      const remaining = await readingNative.remainingMs();
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
    if (local?.accountId === account && local.status === 'paused' && result.reportedSessionIds.includes(local.sessionId)) {
      await readingNative.acknowledge(account, local.sessionId);
      if (!current()) return;
      setNativeSession(null); setSessionNotice(undefined);
    } else if (local?.accountId === account && result.session && local.sessionId === result.session.id) {
      setSessionNotice(undefined);
      setNativeSession(local);
      const remaining = await readingNative.remainingMs();
      if (!current()) return;
      setRemaining(targetRemaining(result, local, remaining));
      if (local.status === 'paused' && result.session.status === 'running') {
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
  }, [queue, refresh, current, account, challengeId, cacheKey]);
  useEffect(() => {
    mounted.current = true;
    setData(null); dataRef.current = null; setNativeSession(null); setRemaining(3_600_000); setBusy(false); setError(undefined); setSessionNotice(undefined);
    void run(synchronize);
    const subscription = AppState.addEventListener('change', s => { if (s === 'active') void run(synchronize); });
    const retry = setInterval(() => { if (AppState.currentState === 'active') void run(synchronize); }, 30_000);
    return () => { mounted.current = false; subscription.remove(); clearInterval(retry); };
  }, [run, synchronize]);
  useEffect(() => {
    let alive = true, polling = false;
    const tick = async () => {
      if (polling || !current() || AppState.currentState !== 'active') return;
      polling = true;
      try {
        const local = await readingNative.snapshot();
        if (!alive || !current()) return;
        if (local?.accountId === account && local.sessionId === dataRef.current?.session?.id) {
          const remaining = await readingNative.remainingMs();
          if (!alive || !current()) return;
          setNativeSession(local); setRemaining(targetRemaining(dataRef.current, local, remaining));
          if (local.status === 'paused' && dataRef.current?.session?.status === 'running') void run(synchronize);
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
  }, [account, current, run, synchronize]);

  const command = (body: Omit<ReadingCommand, 'operationId'>) => run(async () => {
    await queue.enqueue({ ...body, action: String(body.action), operationId: Crypto.randomUUID() });
    await synchronize();
  });
  return { data, remainingMs, busy, error, sessionNotice, startBlocked: !!sessionNotice,
    protection: !capabilities.available ? 'unavailable' as const : !capabilities.authorized ? 'permission' as const : !capabilities.selectedCount ? 'selection' as const : 'ready' as const,
    timerState: nativeSession?.status === 'running' ? 'running' as const : data?.me?.history.find(h => h.day === data.currentDay)?.state === 'complete' ? 'complete' as const
      : nativeSession || data?.session ? 'paused' as const : 'ready' as const,
    awaitingPages: nativeSession?.status === 'paused' || data?.session?.status === 'awaiting_pages',
    needsRecovery: !!data?.session && data.session.status === 'running' && !nativeSession && !sessionNotice,
    retry: () => run(synchronize),
    prepare: () => run(async () => { const c = await readingNative.capabilities();
      if (!c.authorized) await readingNative.authorize(); else await readingNative.selectApps();
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
      if (!c.available || !c.authorized || !c.selectedCount) throw new Error('Сначала подключите блокировку приложений');
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
        if (current()) { setNativeSession(local); setRemaining(targetMs); }
      } catch (e) {
        // Zero-credit closure if native authorization/storage failed after the server reserved the session.
        await queue.enqueue({ action: 'stop', operationId: await readingOperationId(sessionId, 'stop'), challengeId, sessionId, deviceId, elapsedMs: 0, integrity: 'ok' });
        await queue.enqueue({ action: 'report', operationId: await readingOperationId(sessionId, 'report'), challengeId, sessionId, pages: 0 });
        await synchronize();
        throw e;
      }
    }),
    // Pausing never waits on network or a busy API operation.
    pause: async () => {
      try {
        if (!current()) return;
        const beforePause = await readingNative.snapshot();
        if (!current() || beforePause?.accountId !== account || beforePause.sessionId !== dataRef.current?.session?.id) return;
        const local = await readingNative.pause();
        if (current() && local?.accountId === account) { setNativeSession(local); void run(synchronize); }
      } catch (e) { if (current()) setError(readingErrorMessage(e)); }
    },
    report: (pages: number, nextPage?: number) => run(async () => {
      const local = await readingNative.snapshot();
      const server = dataRef.current?.session;
      const ownLocal = local?.accountId === account ? local : null;
      const sessionId = ownLocal?.status === 'paused' && ownLocal.sessionId === server?.id ? ownLocal.sessionId : server?.status === 'awaiting_pages' ? server.id : null;
      if (!sessionId) throw new Error('Сначала остановите таймер');
      if (ownLocal?.status === 'paused' && ownLocal.sessionId === sessionId) {
        await queue.enqueue({ action: 'stop', operationId: await readingOperationId(sessionId, 'stop'),
          challengeId, sessionId, deviceId: ownLocal.deviceId, elapsedMs: ownLocal.elapsedMs ?? 0, integrity: ownLocal.integrity });
      }
      // Save pages BEFORE touching the network. Offline reports survive app termination.
      await queue.enqueue({ action: 'report', operationId: await readingOperationId(sessionId, 'report'), challengeId, sessionId, pages, ...(nextPage !== undefined ? { nextPage } : {}) });
      await synchronize();
    }),
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
    join: (teamId: string) => command({ action: 'apply', challengeId, teamId }),
    review: (memberId: string, decision: 'approved' | 'rejected') => command({ action: 'review', challengeId, memberId, decision }),
    resolve: (userId: string, day: number, decision: 'accept' | 'reject', reason: string) => command({ action: 'resolve', challengeId, userId, day, decision, reason }),
  };
}
