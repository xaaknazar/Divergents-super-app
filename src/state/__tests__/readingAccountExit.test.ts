import { deleteAsync } from 'expo-file-system/legacy';
import { clearAllAppData } from '../reset';
import { deleteAccountAndClear, signOutAndClear } from '../signOut';
import { readingNative, type NativeReadingSession } from '../readingNative';
import { READING_OUTBOX_KEY, type ReadingQueue } from '../readingOutbox';
import { clearKeys } from '../persist';
import { unregisterPushToken } from '../usePush';
import { readingCatalogCache, READING_CATALOG_CACHE_KEY } from '../readingCatalogCache';

jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test-documents/',
  deleteAsync: jest.fn(async () => {}),
}));
jest.mock('../persist', () => ({ clearKeys: jest.fn() }));
jest.mock('../downloads', () => ({ resetDownloadsState: jest.fn(async () => {}) }));
jest.mock('../aiChat', () => ({ resetAiChatState: jest.fn() }));
jest.mock('../../data/achievementEvents', () => ({
  stopAchievementSession: jest.fn(() => null),
}));
jest.mock('../resumeSync', () => ({ stopResumeSync: jest.fn(async () => {}) }));
jest.mock('../challengeReadCache', () => ({
  CHALLENGE_READ_CACHE_KEY: 'dvg.challengeReads.v1',
  challengeReadCache: { reset: jest.fn(async () => {}) },
}));
jest.mock('../readingCatalogCache', () => ({
  READING_CATALOG_CACHE_KEY: 'dvg.readingCatalog.v1',
  readingCatalogCache: { reset: jest.fn(async () => {}) },
}));
jest.mock('../readingNative', () => ({
  readingNative: {
    pause: jest.fn(),
    endLiveActivities: jest.fn(),
    acknowledge: jest.fn(),
    start: jest.fn(),
    snapshot: jest.fn(),
  },
}));
jest.mock('../usePush', () => ({ unregisterPushToken: jest.fn() }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));

const pausedSession: NativeReadingSession = {
  accountId: 'reader-a',
  sessionId: 'session-a',
  deviceId: 'phone',
  book: 'Книга',
  budgetMs: 3_600_000,
  targetMs: 3_600_000,
  anchorMs: 1_000,
  bootId: 'boot',
  elapsedMs: 90_000,
  integrity: 'ok',
  status: 'paused',
};
const pendingReading: ReadingQueue = {
  accountId: 'reader-a',
  commands: [
    { action: 'stop', operationId: 'stop-a', challengeId: 'challenge', sessionId: 'session-a', elapsedMs: 90_000 },
    { action: 'report', operationId: 'report-a', challengeId: 'challenge', sessionId: 'session-a', pages: 4 },
  ],
  otherAccounts: [{
    accountId: 'reader-b',
    commands: [{ action: 'report', operationId: 'report-b', challengeId: 'challenge', sessionId: 'session-b', pages: 2 }],
  }],
};
const pause = jest.mocked(readingNative.pause);
const endCards = jest.mocked(readingNative.endLiveActivities);
let journal: NativeReadingSession | null;
let disk: Record<string, unknown>;
let cardVisible: boolean;
let events: string[];
const getToken = jest.fn(async () => 'current-account-token');
const signOut = jest.fn(async () => { events.push('signOut'); });
const deleteRemoteAccount = jest.fn(async () => { events.push('deleteRemoteAccount'); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function expectReadingEvidencePreserved() {
  expect(disk[READING_OUTBOX_KEY]).toEqual(pendingReading);
  expect(disk['dvg.readingDevice.v1']).toBe('phone');
  expect(journal).toEqual(pausedSession);
}

beforeEach(() => {
  jest.clearAllMocks();
  events = [];
  journal = { ...pausedSession };
  cardVisible = true;
  disk = {
    [READING_OUTBOX_KEY]: JSON.parse(JSON.stringify(pendingReading)),
    'dvg.readingDevice.v1': 'phone',
    'dvg.resume': { name: 'Личные данные' },
    [READING_CATALOG_CACHE_KEY]: ['saved-challenge'],
  };
  pause.mockReset().mockImplementation(async () => {
    events.push('pause');
    return journal;
  });
  endCards.mockReset().mockImplementation(async () => {
    events.push('endCards');
    cardVisible = false;
  });
  jest.mocked(clearKeys).mockReset().mockImplementation(async keys => {
    events.push('clearKeys');
    keys.forEach(key => { delete disk[key]; });
  });
  jest.mocked(unregisterPushToken).mockReset().mockImplementation(async () => {
    events.push('unregisterPush');
    return true;
  });
  signOut.mockReset().mockImplementation(async () => { events.push('signOut'); });
  deleteRemoteAccount.mockReset().mockImplementation(async () => { events.push('deleteRemoteAccount'); });
});

afterEach(() => {
  // Account exit may hide a card, but must never consume or replace an
  // unconfirmed native session or trigger the snapshot's migration path.
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(readingNative.start).not.toHaveBeenCalled();
  expect(readingNative.snapshot).not.toHaveBeenCalled();
});

test('clearAllAppData waits for the running session to pause before hiding its card and preserves evidence', async () => {
  journal = { ...pausedSession, status: 'running', elapsedMs: undefined };
  const frozen = deferred<NativeReadingSession | null>();
  pause.mockImplementationOnce(async () => {
    events.push('pause');
    journal = await frozen.promise;
    return journal;
  });

  const clearing = clearAllAppData();
  expect(readingCatalogCache.reset).toHaveBeenCalledTimes(1);
  expect(pause).toHaveBeenCalledTimes(1);
  expect(endCards).not.toHaveBeenCalled();
  expect(clearKeys).not.toHaveBeenCalled();
  frozen.resolve({ ...pausedSession });
  await clearing;

  expect(events.slice(0, 3)).toEqual(['pause', 'endCards', 'clearKeys']);
  expect(endCards).toHaveBeenCalledTimes(1);
  expect(cardVisible).toBe(false);
  expect(disk['dvg.resume']).toBeUndefined();
  expect(disk[READING_CATALOG_CACHE_KEY]).toBeUndefined();
  expectReadingEvidencePreserved();
  expect(deleteAsync).toHaveBeenCalledTimes(1);
  expect(deleteAsync).toHaveBeenCalledWith('file:///test-documents/downloads/', { idempotent: true });
});

test('sign-out awaits hiding a retained partial-report card even when its journal was already acknowledged', async () => {
  journal = null;
  const hidden = deferred<void>();
  const hiding = deferred<void>();
  endCards.mockImplementationOnce(async () => {
    events.push('endCards');
    hiding.resolve();
    await hidden.promise;
    cardVisible = false;
  });

  const exiting = signOutAndClear({ getToken, signOut });
  await hiding.promise;
  expect(endCards).toHaveBeenCalledTimes(1);
  expect(signOut).not.toHaveBeenCalled();
  expect(clearKeys).not.toHaveBeenCalled();
  hidden.resolve();
  await exiting;

  expect(events).toEqual(['unregisterPush', 'pause', 'endCards', 'clearKeys', 'signOut']);
  expect(unregisterPushToken).toHaveBeenCalledWith(getToken);
  expect(cardVisible).toBe(false);
  expect(journal).toBeNull();
  expect(disk[READING_OUTBOX_KEY]).toEqual(pendingReading);
});

test('a failed pause still hides the card before signing out without discarding reading evidence', async () => {
  pause.mockImplementationOnce(async () => {
    events.push('pause');
    throw new Error('native journal unavailable');
  });

  await expect(signOutAndClear({ getToken, signOut })).resolves.toBeUndefined();

  expect(events).toEqual(['unregisterPush', 'pause', 'endCards', 'clearKeys', 'signOut']);
  expect(cardVisible).toBe(false);
  expectReadingEvidencePreserved();
});

test('a failed card cleanup does not trap the user in their account or erase unconfirmed reading', async () => {
  endCards.mockImplementationOnce(async () => {
    events.push('endCards');
    throw new Error('ActivityKit unavailable');
  });

  await expect(signOutAndClear({ getToken, signOut })).resolves.toBeUndefined();

  expect(events).toEqual(['unregisterPush', 'pause', 'endCards', 'clearKeys', 'signOut']);
  expectReadingEvidencePreserved();
});

test('push-detachment failure still performs the local privacy cleanup before sign-out', async () => {
  jest.mocked(unregisterPushToken).mockRejectedValueOnce(new Error('offline'));

  await expect(signOutAndClear({ getToken, signOut })).resolves.toBeUndefined();

  expect(events).toEqual(['pause', 'endCards', 'clearKeys', 'signOut']);
  expect(cardVisible).toBe(false);
  expectReadingEvidencePreserved();
});

test('account deletion waits for remote success, then pauses and hides the card before sign-out', async () => {
  const deleted = deferred<void>();
  const deletingRemote = deferred<void>();
  deleteRemoteAccount.mockImplementationOnce(async () => {
    events.push('deleteRemoteAccount');
    deletingRemote.resolve();
    await deleted.promise;
  });
  const deleting = deleteAccountAndClear({ getToken, signOut, deleteRemoteAccount });
  await deletingRemote.promise;
  expect(deleteRemoteAccount).toHaveBeenCalledTimes(1);
  expect(pause).not.toHaveBeenCalled();
  expect(endCards).not.toHaveBeenCalled();
  expect(clearKeys).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();

  deleted.resolve();
  await deleting;

  expect(events).toEqual(['unregisterPush', 'deleteRemoteAccount', 'pause', 'endCards', 'clearKeys', 'signOut']);
  expect(cardVisible).toBe(false);
  expectReadingEvidencePreserved();
});

test('failed remote deletion leaves local state, native evidence and the current session untouched', async () => {
  const failure = new Error('delete rejected');
  deleteRemoteAccount.mockRejectedValueOnce(failure);
  const before = JSON.parse(JSON.stringify(disk));

  await expect(deleteAccountAndClear({ getToken, signOut, deleteRemoteAccount })).rejects.toBe(failure);

  expect(pause).not.toHaveBeenCalled();
  expect(endCards).not.toHaveBeenCalled();
  expect(clearKeys).not.toHaveBeenCalled();
  expect(deleteAsync).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
  expect(cardVisible).toBe(true);
  expect(disk).toEqual(before);
  expectReadingEvidencePreserved();
});

test('an already-invalidated Clerk session after deletion does not undo completed privacy cleanup', async () => {
  signOut.mockRejectedValueOnce(new Error('session already deleted'));

  await expect(deleteAccountAndClear({ getToken, signOut, deleteRemoteAccount })).resolves.toBeUndefined();

  expect(endCards).toHaveBeenCalledTimes(1);
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(cardVisible).toBe(false);
  expectReadingEvidencePreserved();
});
