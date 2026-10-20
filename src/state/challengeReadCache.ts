import { ReadAccessError } from '../data/readAccessError';
import { clearKeys, loadJSON, saveJSON } from './persist';

export const CHALLENGE_READ_CACHE_KEY = 'dvg.challengeReads.v1';
const MAX_ENTRIES = 20;
const MAX_AGE = 24 * 60 * 60_000;
export const READ_DEADLINE_MS = 15_000;
type Entry = { data: unknown; updatedAt: number };
type Snapshot = { data: unknown; updatedAt: number; loading: boolean; error: boolean };
const EMPTY: Snapshot = { data: null, updatedAt: 0, loading: false, error: false };

/** Bounded, account-scoped SWR cache. No tokens or pending marks are stored here. */
export function createChallengeReadCache() {
  const entries = new Map<string, Snapshot>();
  const listeners = new Set<() => void>();
  const pending = new Map<string, Promise<void>>();
  let generation = 0;
  let hydration: Promise<void> | null = null;
  const emit = () => listeners.forEach(listener => listener());
  const trim = () => {
    const oldest = [...entries].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    for (const [key] of oldest.slice(0, Math.max(0, oldest.length - MAX_ENTRIES))) entries.delete(key);
  };
  const persist = () => {
    trim();
    const records = [...entries].filter(([, value]) => value.data && Date.now() - value.updatedAt < MAX_AGE)
      .map(([key, { data, updatedAt }]) => [key, { data, updatedAt }] as const);
    void saveJSON(CHALLENGE_READ_CACHE_KEY, records).catch(() => {});
  };
  const get = (key: string): Snapshot => {
    const entry = entries.get(key);
    return entry && (!entry.data || Date.now() - entry.updatedAt < MAX_AGE) ? entry : EMPTY;
  };
  return {
    get,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate() {
      if (hydration) return hydration;
      const version = generation;
      hydration = loadJSON<unknown>(CHALLENGE_READ_CACHE_KEY, []).then(raw => {
        if (version !== generation || !Array.isArray(raw)) return;
        for (const record of raw.slice(-MAX_ENTRIES)) {
          if (!Array.isArray(record) || typeof record[0] !== 'string') continue;
          const [key, item] = record as [string, Entry];
          if (!item?.data || !Number.isFinite(item.updatedAt) || item.updatedAt > Date.now()
              || Date.now() - item.updatedAt >= MAX_AGE) continue;
          const current = entries.get(key);
          if (current?.updatedAt && current.updatedAt >= item.updatedAt) continue;
          entries.set(key, { data: item.data, updatedAt: item.updatedAt, loading: current?.loading ?? false, error: current?.error ?? false });
        }
        trim(); emit();
      }).catch(() => {});
      return hydration;
    },
    load(key: string, loader: (signal: AbortSignal) => Promise<unknown>, force = false, staleMs = 30_000) {
      const active = pending.get(key);
      if (active) return active;
      const cached = get(key);
      if (!force && cached.data && !cached.error && Date.now() - cached.updatedAt < staleMs) return Promise.resolve();
      const version = generation;
      const ctrl = new AbortController();
      entries.set(key, { ...cached, loading: true, error: false }); emit();
      let timer: ReturnType<typeof setTimeout>;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { ctrl.abort(); reject(new Error('Read deadline exceeded')); }, READ_DEADLINE_MS);
      });
      const operation = Promise.race([Promise.resolve().then(() => loader(ctrl.signal)), deadline]).then(data => {
        if (version !== generation) return;
        if (!data) throw new Error('Missing response');
        entries.set(key, { data, updatedAt: Date.now(), loading: false, error: false }); persist();
      }).catch(error => {
        if (version !== generation) return;
        const denied = error instanceof ReadAccessError;
        entries.set(key, { ...(denied ? { data: null, updatedAt: Date.now() } : get(key)), loading: false, error: true });
        if (denied) persist();
      }).finally(() => {
        clearTimeout(timer);
        if (version === generation) { pending.delete(key); emit(); }
      });
      pending.set(key, operation);
      return operation;
    },
    reset() {
      generation++; entries.clear(); pending.clear(); hydration = null; emit();
      return clearKeys([CHALLENGE_READ_CACHE_KEY]);
    },
  };
}

export const challengeReadCache = createChallengeReadCache();
export const challengeReadKey = (userId: string, challengeId: string, kind: string) => JSON.stringify([userId, challengeId, kind]);
