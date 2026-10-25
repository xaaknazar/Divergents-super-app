import { requireOptionalNativeModule } from 'expo-modules-core';
import { z } from 'zod';

export type ReadingBlockingMode = 'all-apps' | 'selected';
export const NativeReadingSchema = z.object({ accountId: z.string(), sessionId: z.string(), deviceId: z.string(), book: z.string(),
  budgetMs: z.number().min(0).max(86_400_000), targetMs: z.number().nullable().optional(), anchorMs: z.number(), bootId: z.string(), elapsedMs: z.number().nullable().optional(),
  // Measured under the same native lock as status/session/generation. Never
  // join a running snapshot with a later remainingMs from a different state.
  measuredElapsedMs: z.number().finite().min(0).max(86_400_000).optional(),
  // Existing sessions retain their original selected-app policy after an update.
  blockingMode: z.enum(['all-apps', 'selected']).optional(),
  allowedAppCount: z.number().int().min(0).max(50).optional(),
  // Explicit per-session version: a new binary must not reopen legacy journals
  // whose immutable stop may already be queued or accepted by the server.
  resumeVersion: z.literal(1).optional(), terminal: z.boolean().optional(), canResume: z.boolean().optional(),
  accumulatedMs: z.number().min(0).optional(), deadlineMs: z.number().optional(), generation: z.string().optional(),
  integrity: z.enum(['ok', 'revoked', 'rebooted']), status: z.enum(['running', 'paused']) });
export type NativeReadingSession = z.infer<typeof NativeReadingSchema>;
const LiveActivityStatusSchema = z.object({
  state: z.enum(['active', 'stale', 'paused', 'missing', 'disabled', 'ended', 'error', 'unsupported']),
  canRestore: z.boolean(), activityId: z.string().optional(), error: z.string().optional(),
});
export type ReadingLiveActivityStatus = z.infer<typeof LiveActivityStatusSchema>;
export type ReadingCapabilities = { available: boolean; authorized: boolean; selectedCount: number; platform: string; blockingMode: ReadingBlockingMode; liveActivityEnabled?: boolean; supportsResume?: boolean; supportsAllowedApps?: boolean };
const AllowedAppsStatusSchema = z.object({ count: z.number().int().min(0).max(50), revision: z.string().min(1),
  editable: z.boolean(), needsReselection: z.boolean() });
export type ReadingAllowedAppsStatus = z.infer<typeof AllowedAppsStatusSchema>;
type NativeFocus = {
  capabilities(): Promise<Omit<ReadingCapabilities, 'blockingMode'> & { blockingMode?: ReadingBlockingMode }>;
  authorize(): Promise<void>; selectApps(): Promise<void>;
  start(accountId: string, sessionId: string, deviceId: string, book: string, budgetMs: number, targetMs: number): Promise<string>;
  snapshot(): Promise<string | null>; pause(): Promise<string | null>; remainingMs(): Promise<number>;
  clock?(): Promise<unknown>;
  attestSupported?(): Promise<boolean>; attestGenerateKey?(): Promise<string>;
  attestKey?(keyId: string, clientData: string): Promise<string>; attestAssertion?(keyId: string, clientData: string): Promise<string>;
  acknowledge(accountId: string, sessionId: string): Promise<void>;
  configurePageReminder?(accountId: string, sessionId: string, challengeId: string): Promise<void>;
  reconcileLiveActivity?(accountId: string, sessionId: string): Promise<unknown>;
  restoreLiveActivity?(accountId: string, sessionId: string): Promise<unknown>;
  endLiveActivities?(): Promise<void>;
  resume?(accountId: string, sessionId: string, expectedGeneration: string): Promise<string>;
  finish?(accountId: string, sessionId: string, expectedGeneration: string): Promise<string>;
  allowedAppsStatus?(accountId: string): Promise<unknown>;
  selectAllowedApps?(accountId: string, expectedRevision: string | null): Promise<unknown>;
};
const native = requireOptionalNativeModule<NativeFocus>('ReadingFocus');
const ClockSchema = z.object({ uptimeMs: z.number().finite().nonnegative(), bootId: z.string().min(1) });
/** Monotonic phone clock (counts sleep, ignores date changes) with the boot it belongs to. */
export type ReadingClock = z.infer<typeof ClockSchema>;
const parse = (raw: string | null) => raw ? NativeReadingSchema.parse(JSON.parse(raw)) : null;
let snapshotRead: Promise<NativeReadingSession | null> | null = null;
let journalRevision = 0;
async function changeJournal<T>(action: () => Promise<T>): Promise<T> {
  // Never make a safety control wait for a poll. Invalidate both sides of the
  // native call, including ambiguous failures which may have persisted first.
  journalRevision += 1; snapshotRead = null;
  try { return await action(); }
  finally { journalRevision += 1; snapshotRead = null; }
}
// Old physical-device QA builds shared the production App Group. These exact
// markers identify a local-only test, never a Clerk account or server session.
export function isLegacyReadingQASession(session: NativeReadingSession) {
  return session.resumeVersion !== 1 && session.accountId === 'qa-no-real-account' && session.deviceId === 'qa-iphone'
    && session.book === 'Проверка блокировки' && session.budgetMs <= 900_000;
}
function requireFocus(): NativeFocus {
  if (!native) throw new Error('Нужна сборка с системной блокировкой приложений. Обычный таймер не заменяет защиту.');
  return native;
}
async function liveActivityStatus(method: 'reconcileLiveActivity' | 'restoreLiveActivity', accountId: string, sessionId: string): Promise<ReadingLiveActivityStatus> {
  // Older iOS and Android binaries still provide protection without this UI.
  if (!native?.[method]) return { state: 'unsupported', canRestore: false };
  const raw = await native[method](accountId, sessionId);
  return LiveActivityStatusSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw);
}
export const readingNative = {
  capabilities: async (): Promise<ReadingCapabilities> => {
    if (!native) return { available: false, authorized: false, selectedCount: 0, platform: 'unsupported', blockingMode: 'selected' };
    const caps = await native.capabilities();
    // Android and older native builds use selection. Never infer strict mode
    // from the platform or fabricate a selected-app count to enable the UI.
    return { ...caps, blockingMode: caps.blockingMode === 'all-apps' ? 'all-apps' : 'selected' };
  },
  authorize: () => requireFocus().authorize(), selectApps: () => requireFocus().selectApps(),
  allowedAppsStatus: async (accountId: string): Promise<ReadingAllowedAppsStatus> => {
    if (!native?.allowedAppsStatus) return { count: 0, revision: 'unsupported', editable: false, needsReselection: false };
    const raw = await native.allowedAppsStatus(accountId);
    return AllowedAppsStatusSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw);
  },
  selectAllowedApps: async (accountId: string, expectedRevision?: string): Promise<ReadingAllowedAppsStatus> => {
    if (!accountId || !native?.selectAllowedApps) throw new Error('Выбор разрешённых приложений недоступен в этой сборке.');
    const raw = await native.selectAllowedApps(accountId, expectedRevision ?? null);
    return AllowedAppsStatusSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw);
  },
  start: async (accountId: string, sessionId: string, deviceId: string, book: string, budgetMs: number, targetMs: number) =>
    changeJournal(async () => NativeReadingSchema.parse(JSON.parse(await requireFocus().start(accountId, sessionId, deviceId, book, budgetMs, targetMs)))),
  snapshot: (): Promise<NativeReadingSession | null> => {
    // Screen refresh and the one-second clock can read simultaneously. Share the
    // read/migration so the second caller cannot acknowledge a removed QA file.
    if (snapshotRead) return snapshotRead;
    const revision = journalRevision;
    const read = (async (): Promise<NativeReadingSession | null> => {
      if (!native) return null;
      let raw: string | null;
      try { raw = await native.snapshot(); }
      catch (e) { if (revision !== journalRevision) return readingNative.snapshot(); throw e; }
      // A response captured before pause/resume/start/acknowledge is obsolete,
      // even if the bridge delivers it after the control has already finished.
      if (revision !== journalRevision) return readingNative.snapshot();
      const session = parse(raw);
      // Only completed, positively identified QA data can be removed locally.
      // A live test or any real account's evidence must never be reset here.
      if (session?.status === 'paused' && isLegacyReadingQASession(session)) {
        try { await native.acknowledge(session.accountId, session.sessionId); }
        catch { throw new Error('Не удалось завершить очистку проверочного таймера на телефоне. Нажмите «Повторить». Реальные результаты не изменены.'); }
        return null;
      }
      return session;
    })().finally(() => { if (snapshotRead === read) snapshotRead = null; });
    snapshotRead = read;
    return read;
  },
  pause: () => changeJournal(async () => native ? parse(await native.pause()) : null),
  resume: async (accountId: string, sessionId: string, expectedGeneration: string): Promise<NativeReadingSession> => {
    if (!native?.resume) throw new Error('Этот подход нельзя продолжить в этой сборке. Сохраните страницы и начните новый.');
    return changeJournal(async () => NativeReadingSchema.parse(JSON.parse(await native.resume!(accountId, sessionId, expectedGeneration))));
  },
  finish: async (accountId: string, sessionId: string, expectedGeneration: string): Promise<NativeReadingSession> => {
    if (!native?.finish) throw new Error('Завершение этого подхода недоступно в этой сборке.');
    return changeJournal(async () => NativeReadingSchema.parse(JSON.parse(await native.finish!(accountId, sessionId, expectedGeneration))));
  },
  remainingMs: async () => native ? native.remainingMs() : 0,
  /** App Attest (iOS). Every call is null when unavailable or failed: proof is optional evidence. */
  attest: {
    supported: async () => { try { return !!(await native?.attestSupported?.()); } catch { return false; } },
    generateKey: async () => { try { return (await native?.attestGenerateKey?.()) ?? null; } catch { return null; } },
    attestKey: async (keyId: string, clientData: string) => { try { return (await native?.attestKey?.(keyId, clientData)) ?? null; } catch { return null; } },
    assertion: async (keyId: string, clientData: string) => { try { return (await native?.attestAssertion?.(keyId, clientData)) ?? null; } catch { return null; } },
  },
  /** Null on builds without it: then only the phone's wall clock is known. */
  clock: async (): Promise<ReadingClock | null> => {
    if (!native?.clock) return null;
    try { const raw = await native.clock(); return ClockSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw); }
    catch { return null; }
  },
  acknowledge: (accountId: string, sessionId: string) => changeJournal(() => requireFocus().acknowledge(accountId, sessionId)),
  configurePageReminder: async (accountId: string, sessionId: string, challengeId: string): Promise<void> => {
    await native?.configurePageReminder?.(accountId, sessionId, challengeId);
  },
  reconcileLiveActivity: (accountId: string, sessionId: string) => liveActivityStatus('reconcileLiveActivity', accountId, sessionId),
  restoreLiveActivity: (accountId: string, sessionId: string) => liveActivityStatus('restoreLiveActivity', accountId, sessionId),
  // Account exit is distinct from a reading pause: hide even retained cards
  // whose segment journal was already acknowledged. Do not erase evidence.
  endLiveActivities: async (): Promise<void> => { await native?.endLiveActivities?.(); },
};
