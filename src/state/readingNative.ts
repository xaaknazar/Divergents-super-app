import { requireOptionalNativeModule } from 'expo-modules-core';
import { z } from 'zod';

export const NativeReadingSchema = z.object({ accountId: z.string(), sessionId: z.string(), deviceId: z.string(), book: z.string(),
  budgetMs: z.number().min(0).max(86_400_000), targetMs: z.number().nullable().optional(), anchorMs: z.number(), bootId: z.string(), elapsedMs: z.number().nullable().optional(),
  integrity: z.enum(['ok', 'revoked', 'rebooted']), status: z.enum(['running', 'paused']) });
export type NativeReadingSession = z.infer<typeof NativeReadingSchema>;
export type ReadingCapabilities = { available: boolean; authorized: boolean; selectedCount: number; platform: string };
type NativeFocus = {
  capabilities(): Promise<ReadingCapabilities>;
  authorize(): Promise<void>; selectApps(): Promise<void>;
  start(accountId: string, sessionId: string, deviceId: string, book: string, budgetMs: number, targetMs: number): Promise<string>;
  snapshot(): Promise<string | null>; pause(): Promise<string | null>; remainingMs(): Promise<number>;
  acknowledge(accountId: string, sessionId: string): Promise<void>;
};
const native = requireOptionalNativeModule<NativeFocus>('ReadingFocus');
const parse = (raw: string | null) => raw ? NativeReadingSchema.parse(JSON.parse(raw)) : null;
let snapshotRead: Promise<NativeReadingSession | null> | null = null;
// Old physical-device QA builds shared the production App Group. These exact
// markers identify a local-only test, never a Clerk account or server session.
export function isLegacyReadingQASession(session: NativeReadingSession) {
  return session.accountId === 'qa-no-real-account' && session.deviceId === 'qa-iphone'
    && session.book === 'Проверка блокировки' && session.budgetMs <= 900_000;
}
function requireFocus(): NativeFocus {
  if (!native) throw new Error('Нужна сборка с системной блокировкой приложений. Обычный таймер не заменяет защиту.');
  return native;
}
export const readingNative = {
  capabilities: async (): Promise<ReadingCapabilities> => native ? native.capabilities() : { available: false, authorized: false, selectedCount: 0, platform: 'unsupported' },
  authorize: () => requireFocus().authorize(), selectApps: () => requireFocus().selectApps(),
  start: async (accountId: string, sessionId: string, deviceId: string, book: string, budgetMs: number, targetMs: number) =>
    NativeReadingSchema.parse(JSON.parse(await requireFocus().start(accountId, sessionId, deviceId, book, budgetMs, targetMs))),
  snapshot: () => {
    // Screen refresh and the one-second clock can read simultaneously. Share the
    // read/migration so the second caller cannot acknowledge a removed QA file.
    if (!snapshotRead) snapshotRead = (async () => {
      if (!native) return null;
      const session = parse(await native.snapshot());
      // Only completed, positively identified QA data can be removed locally.
      // A live test or any real account's evidence must never be reset here.
      if (session?.status === 'paused' && isLegacyReadingQASession(session)) {
        try { await native.acknowledge(session.accountId, session.sessionId); }
        catch { throw new Error('Не удалось завершить очистку проверочного таймера на телефоне. Нажмите «Повторить». Реальные результаты не изменены.'); }
        return null;
      }
      return session;
    })().finally(() => { snapshotRead = null; });
    return snapshotRead;
  },
  pause: async () => native ? parse(await native.pause()) : null,
  remainingMs: async () => native ? native.remainingMs() : 0,
  acknowledge: (accountId: string, sessionId: string) => requireFocus().acknowledge(accountId, sessionId),
};
