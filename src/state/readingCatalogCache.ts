import { createChallengeReadCache } from './challengeReadCache';

export const READING_CATALOG_CACHE_KEY = 'dvg.readingCatalog.v1';
export const readingCatalogKey = (accountId: string) => JSON.stringify([accountId, 'reading-catalog']);
// Discovery only: a saved card opens the existing account-bound detail/timer.
// Do not expire that doorway overnight. Membership, native protection, signed
// time and the outbox remain governed by useReadingChallenge and the server.
export const readingCatalogCache = createChallengeReadCache({
  storageKey: READING_CATALOG_CACHE_KEY, maxEntries: 1, maxAgeMs: Number.POSITIVE_INFINITY,
});
