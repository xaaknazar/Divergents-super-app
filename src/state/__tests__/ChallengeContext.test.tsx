import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ChallengeProvider, useChallenge } from '../ChallengeContext';
import { DEFAULT_CHALLENGE, fetchActiveChallenges, postChallengeProgress, type ActiveChallengeData } from '../../data/community';
import { readJSON, saveJSON } from '../persist';

const mockAuth: any = { isSignedIn: true, userId: 'owner', getToken: async () => 'token' };
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => mockAuth }));
jest.mock('../persist', () => ({ readJSON: jest.fn(), loadJSON: jest.fn(async () => null), saveJSON: jest.fn(async () => {}) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'operation-' + Math.random() }));
jest.mock('expo-notifications', () => ({ addNotificationReceivedListener: () => ({ remove() {} }), cancelScheduledNotificationAsync: jest.fn() }));
jest.mock('../../data/community', () => ({ ...jest.requireActual('../../data/community'), fetchActiveChallenges: jest.fn(), postChallengeProgress: jest.fn() }));
let root: ReturnType<typeof useChallenge>, first: typeof root, second: typeof root, unknown: typeof root;
function Probe() {
  root = useChallenge(); first = useChallenge('first'); second = useChallenge('second'); unknown = useChallenge('missing');
  return null;
}
function snapshot(id: string, day: number, value = 10): ActiveChallengeData {
  return { ok: true, challenge: { ...DEFAULT_CHALLENGE, id, title: id, startISO: undefined, currentDay: day,
    tasks: [{ id: 'reading', kind: 'metric', title: 'Чтение', icon: 'book', current: value, min: 20, unit: 'стр.', basePts: 20, unitSize: 1, ptsPerUnit: 1, version: 0 }] },
    members: [{ id: 'owner', name: 'Участник', isMe: true, weekBase: 0, day: value, coefficient: 1, todayTasks: [] }] };
}
const initial = () => ({ ok: true, challenges: [snapshot('first', 7), snapshot('second', 2, 30)] });
const app = () => <ChallengeProvider><Probe /></ChallengeProvider>;
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-10T12:00:00Z')); jest.clearAllMocks();
  mockAuth.userId = 'owner'; mockAuth.isSignedIn = true;
  jest.mocked(readJSON).mockResolvedValue({ ok: true, value: null });
  jest.mocked(fetchActiveChallenges).mockResolvedValue(initial());
  jest.mocked(postChallengeProgress).mockImplementation(async (_id, op) => ({ ok: true, status: 200, version: op.expectedVersion! + 1, savedValue: op.value ?? 0, savedDone: op.done ?? false }));
});
afterEach(() => jest.useRealTimers());
test('each membership resolves its own day, tasks, scoring and write scope', async () => {
  await render(app());
  expect(root.activeChallenges?.map(c => c.id)).toEqual(['first', 'second']);
  expect([first.challenge.currentDay, second.challenge.currentDay]).toEqual([7, 2]);
  expect([first.pointsToday, second.pointsToday]).toEqual([10, 30]);
  await act(async () => { second.setMetric('reading', 40); });
  expect(postChallengeProgress).toHaveBeenCalledWith('second', expect.objectContaining({ challengeId: 'second', taskId: 'reading', value: 40, day: 2 }), 'token');
  expect([first.pointsToday, second.pointsToday]).toEqual([10, 40]);
  expect(unknown.isParticipant).toBe(false); expect(unknown.canMark).toBe(false);
  await act(async () => unknown.setMetric('reading', 999));
  expect(postChallengeProgress).toHaveBeenCalledTimes(1);
});
test('a rejected mark is scoped to its challenge and cannot block a second membership', async () => {
  jest.mocked(postChallengeProgress).mockImplementation(async (id, op) => id === 'first'
    ? { ok: false, status: 409, reason: 'version_conflict' }
    : { ok: true, status: 200, version: op.expectedVersion! + 1, savedValue: op.value!, savedDone: false });
  await render(app());
  await act(async () => first.setMetric('reading', 20));
  expect(first.syncError).toBe('version_conflict'); expect(second.syncError).toBeNull();
  await act(async () => second.setMetric('reading', 35));
  expect(second.pointsToday).toBe(35); expect(second.syncPending).toBe(false);
});
test('network failure preserves both trackers and durable marks across remount', async () => {
  jest.mocked(postChallengeProgress).mockResolvedValue({ ok: false, status: 0, reason: 'network' });
  const view = await render(app());
  await act(async () => second.setMetric('reading', 50));
  expect(first.syncPending).toBe(false); expect(second.syncPending).toBe(true);
  const saved = jest.mocked(saveJSON).mock.calls.filter(c => c[0] === 'dvg.challengeProgressOutbox.v2').at(-1)![1];
  jest.mocked(fetchActiveChallenges).mockResolvedValue({ ok: false, challenges: [] });
  await act(async () => { await root.refresh(); });
  expect(root.activeChallenges).toHaveLength(2); expect(second.pointsToday).toBe(50);
  await view.unmount();
  jest.mocked(readJSON).mockResolvedValue({ ok: true, value: saved });
  jest.mocked(fetchActiveChallenges).mockResolvedValue(initial());
  await render(app());
  expect(second.pointsToday).toBe(50); expect(first.pointsToday).toBe(10);
});
test('late requests cannot replace newer membership data', async () => {
  await render(app());
  let resolve!: (value: ReturnType<typeof initial>) => void;
  jest.mocked(fetchActiveChallenges).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  let older!: Promise<boolean>;
  await act(async () => { older = root.refresh(); });
  jest.mocked(fetchActiveChallenges).mockResolvedValue({ ok: true, challenges: [snapshot('second', 3)] });
  await act(async () => { await root.refresh(); });
  await act(async () => { resolve(initial()); await older; });
  expect(root.activeChallenges?.map(c => c.id)).toEqual(['second']);
  expect(first.isParticipant).toBe(false); expect(second.challenge.currentDay).toBe(3);
});
test('stale screen callbacks cannot write yesterday or use another account', async () => {
  const view = await render(app()); const oldEdit = second.setMetric;
  jest.mocked(fetchActiveChallenges).mockResolvedValue({ ok: true, challenges: [snapshot('second', 3)] });
  await act(async () => { await root.refresh(); oldEdit('reading', 99); });
  expect(postChallengeProgress).not.toHaveBeenCalled();
  await act(async () => oldEdit('reading', 99));
  expect(postChallengeProgress).not.toHaveBeenCalled();
  const ownerEdit = second.setMetric;
  mockAuth.userId = 'another'; jest.mocked(fetchActiveChallenges).mockResolvedValue({ ok: true, challenges: [] });
  await view.rerender(app());
  await act(async () => ownerEdit('reading', 99));
  expect(postChallengeProgress).not.toHaveBeenCalled(); expect(root.activeChallenges).toEqual([]);
});
