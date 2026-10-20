import type { Metric, AchievementStats } from './achievementCatalog';

export interface AchievementUpdate {
  facts?: Partial<Record<Metric, string[]>>;
  maxima?: AchievementStats;
  silent?: boolean;
  /** The first snapshot is a silent backfill; later new facts may be announced. */
  source?: string;
}
type Listener = (update: AchievementUpdate) => void;
let active: { listener: Listener; key: string; userId: string; deactivate: () => void } | null = null;

export function connectAchievements(key: string, listener: Listener, deactivate = () => {}, userId = key): () => void {
  const session = { key, listener, deactivate, userId };
  active = session;
  return () => { if (active === session) active = null; };
}

/** Capture BEFORE awaiting network/native work: an old account's late response
 * must never award the new account (including sign-out then same-account login). */
export function captureAchievementRecorder(token?: string | null): Listener {
  const session = active;
  // This is correlation, NOT authentication (the API verifies the JWT). It also
  // closes the gap when an old screen's getToken() resolves after account switch.
  if (token !== undefined && (!session || tokenSubject(token) !== session.userId)) return () => {};
  return update => { if (session && active === session) session.listener(update); };
}

function tokenSubject(token: string | null): string | null {
  try {
    const segments = token?.split('.');
    if (segments?.length !== 3 || segments[1].length > 16000) return null;
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let bits = 0, buffer = 0, decoded = '';
    for (const c of base64) {
      const n = alphabet.indexOf(c); if (n < 0) return null;
      buffer = (buffer << 6) | n; bits += 6;
      if (bits >= 8) { bits -= 8; decoded += String.fromCharCode((buffer >> bits) & 255); }
    }
    const payload = JSON.parse(decoded);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}

export function stopAchievementSession(): string | null {
  const key = active?.key ?? null;
  active?.deactivate();
  active = null;
  return key;
}
