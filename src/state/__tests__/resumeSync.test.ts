import { enqueueResume, flushResume, pendingResume, RESUME_OUTBOX, stopResumeSync } from '../resumeSync';
import { submitResume } from '../../data/talentslab';
import { syncResumeSnapshot } from '../../data/api';
import { readJSON, saveJSON } from '../persist';
import { NicknameTakenError } from '../../data/nickname';

const mockStore = new Map<string, unknown>();
jest.mock('../persist', () => ({
  loadJSON: jest.fn(async (key, fallback) => mockStore.has(key) ? mockStore.get(key) : fallback),
  readJSON: jest.fn(async (key, fallback) => ({ value: mockStore.has(key) ? mockStore.get(key) : fallback, ok: true })),
  saveJSON: jest.fn(async (key, value) => { mockStore.set(key, value); }),
}));
jest.mock('../../data/talentslab', () => ({
  ...jest.requireActual('../../data/talentslab'),
  submitResume: jest.fn(),
  getTalentslabToken: jest.fn(async (getToken) => getToken()),
}));
jest.mock('../../data/api', () => ({ syncResumeSnapshot: jest.fn() }));
jest.mock('../profileBus', () => ({ emitProfileChanged: jest.fn() }));
const token = async () => 'token';

beforeEach(async () => {
  await stopResumeSync();
  mockStore.clear();
  jest.clearAllMocks();
  jest.mocked(submitResume).mockResolvedValue(true);
  jest.mocked(syncResumeSnapshot).mockResolvedValue(true);
});

it('creates/upserts the questionnaire and repairs application snapshots before acknowledging sync', async () => {
  expect(await enqueueResume('a', { first_name: 'Анна' }, token)).toBe(true);
  expect(submitResume).toHaveBeenCalledWith('token', { first_name: 'Анна' });
  expect(syncResumeSnapshot).toHaveBeenCalledWith('token', expect.objectContaining({ found: true, fullName: 'Анна' }));
  expect(await pendingResume('a')).toBeNull();
  expect(mockStore.get('dvg.resumePending')).toBe(false);
});

it('keeps a rejected nickname and other answers, blocks background retries, and allows a corrected save', async () => {
  jest.mocked(syncResumeSnapshot).mockRejectedValueOnce(new NicknameTakenError());
  await expect(enqueueResume('a', { nickname: 'Beknazar', phone: '123' }, token)).rejects.toThrow('nickname_taken');
  expect(submitResume).not.toHaveBeenCalled();
  expect(await pendingResume('a')).toMatchObject({ blockedReason: 'nickname_taken', answers: { nickname: 'Beknazar', phone: '123' } });
  await stopResumeSync(); // blocked state survives restarting the retry worker
  await expect(flushResume('a', token, true)).rejects.toThrow('nickname_taken');
  expect(syncResumeSnapshot).toHaveBeenCalledTimes(1);
  expect(await enqueueResume('a', { nickname: 'Beknazar01' }, token, { nickname: 'Beknazar01', phone: '123' })).toBe(true);
  expect(submitResume).toHaveBeenLastCalledWith('token', { nickname: 'Beknazar01', phone: '123' });
  expect(await pendingResume('a')).toBeNull();
});

it('also preserves conflicts from Talentslab', async () => {
  jest.mocked(submitResume).mockRejectedValueOnce(new NicknameTakenError());
  await expect(enqueueResume('a', { nickname: 'Anna' }, token)).rejects.toThrow('nickname_taken');
  expect((await pendingResume('a'))?.blockedReason).toBe('nickname_taken');
});

it('retains the saved snapshot on failure and retries it, not a later unfinished draft', async () => {
  jest.mocked(submitResume).mockResolvedValueOnce(false);
  expect(await enqueueResume('a', { nickname: 'Anna' }, token)).toBe(false);
  mockStore.set('dvg.resume', { nickname: 'UnfinishedDraft' });
  expect(await flushResume('a', token, true)).toBe(true);
  expect(submitResume).toHaveBeenLastCalledWith('token', { nickname: 'Anna' });
});

it('retains a retry if Talentslab succeeded but the application snapshot did not', async () => {
  jest.mocked(syncResumeSnapshot).mockResolvedValueOnce(false);
  expect(await enqueueResume('a', { phone: '123' }, token)).toBe(false);
  expect(await pendingResume('a')).not.toBeNull();
  expect(await flushResume('a', token, true)).toBe(true);
});

it('never sends one account’s pending questionnaire using another account’s session', async () => {
  jest.mocked(submitResume).mockResolvedValueOnce(false);
  await enqueueResume('a', { nickname: 'Anna' }, token);
  jest.clearAllMocks();
  await flushResume('b', token, true);
  expect(submitResume).not.toHaveBeenCalled();
  expect(await pendingResume('a')).not.toBeNull();
});

it('serializes saves and does not clear a newer queued edit with an older acknowledgement', async () => {
  let resolve!: (ok: boolean) => void;
  jest.mocked(submitResume).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const first = enqueueResume('a', { phone: 'old' }, token);
  while (!resolve) await new Promise((done) => setTimeout(done, 0));
  const second = enqueueResume('a', { phone: 'new' }, token);
  while ((await pendingResume('a'))?.answers.phone !== 'new') await new Promise((done) => setTimeout(done, 0));
  resolve(true);
  expect(await first).toBe(true);
  expect(await second).toBe(true);
  expect(submitResume).toHaveBeenLastCalledWith('token', { phone: 'new' });
  expect(await pendingResume('a')).toBeNull();
});

it('does not recreate local data when a request finishes after logout', async () => {
  let resolve!: (ok: boolean) => void;
  jest.mocked(submitResume).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const flight = enqueueResume('a', { nickname: 'Anna' }, token);
  while (!resolve) await new Promise((done) => setTimeout(done, 0));
  await stopResumeSync();
  mockStore.clear();
  jest.mocked(saveJSON).mockClear();
  resolve(true);
  expect(await flight).toBe(false);
  expect(saveJSON).not.toHaveBeenCalled();
  expect(mockStore.has(RESUME_OUTBOX)).toBe(false);
});

it('increments a restored revision instead of reusing an in-flight revision after restart', async () => {
  mockStore.set(RESUME_OUTBOX, { owner: 'a', revision: 999, answers: { phone: 'old' }, snapshot: { phone: 'old' } });
  let resolve!: (ok: boolean) => void;
  jest.mocked(submitResume).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const flight = flushResume('a', token, true);
  while (!resolve) await new Promise((done) => setTimeout(done, 0));
  const newer = enqueueResume('a', { phone: 'new' }, token);
  while ((await pendingResume('a'))?.answers.phone !== 'new') await new Promise((done) => setTimeout(done, 0));
  expect((await pendingResume('a'))!.revision).toBeGreaterThan(999);
  resolve(true);
  await Promise.all([flight, newer]);
  expect(submitResume).toHaveBeenLastCalledWith('token', { phone: 'new' });
});

it('does not overwrite an unreadable queue or claim an unwritten save succeeded', async () => {
  jest.mocked(readJSON).mockResolvedValueOnce({ value: null, ok: false });
  await expect(enqueueResume('a', { phone: '123' }, token)).rejects.toThrow('resume_outbox_read_failed');
  expect(saveJSON).not.toHaveBeenCalled();
  jest.mocked(saveJSON).mockResolvedValueOnce(undefined);
  await expect(enqueueResume('a', { phone: '123' }, token)).rejects.toThrow('resume_outbox_write_failed');
  expect(submitResume).not.toHaveBeenCalled();
});
