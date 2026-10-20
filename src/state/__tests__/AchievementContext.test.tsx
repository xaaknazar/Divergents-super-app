import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { AchievementProvider, useAchievements } from '../AchievementContext';
import { captureAchievementRecorder, stopAchievementSession } from '../../data/achievementEvents';
import { readJSON, saveJSON } from '../persist';
import { emptyAchievementLedger } from '../../data/achievementProgress';

jest.mock('../persist', () => ({ readJSON: jest.fn(), saveJSON: jest.fn() }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: 'user_a', getToken: async () => 'token' }) }));
jest.mock('../FitnessContext', () => ({ useFitness: () => ({ loaded: true, programs: [], goals: [] }) }));
jest.mock('../ActivityContext', () => ({ useActivities: () => ({ loaded: true, workouts: [] }) }));
jest.mock('../ChallengeContext', () => ({ useChallenge: () => ({ isParticipant: false, challenge: { id: 'preview' } }) }));
jest.mock('../../data/api', () => ({ fetchMyCourses: jest.fn(async () => []), fetchOwnedDetail: jest.fn(), fetchMyTrips: jest.fn(async () => []), fetchMyMeetups: jest.fn(async () => []), fetchMySport: jest.fn(async () => []) }));
jest.mock('../../data/books', () => ({ fetchMyShelf: jest.fn(async () => []) }));
jest.mock('../../data/community', () => ({ fetchMyChallengeHistory: jest.fn(async () => []) }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => jest.requireActual('../../theme/tokens') }));
jest.mock('../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../navigation/ref', () => ({ navigationRef: { isReady: () => false } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }) }));

function Probe() {
  const { earned, ready, storageError } = useAchievements();
  return <Text>{`${earned}|${ready}|${storageError}`}</Text>;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readJSON).mockResolvedValue({ ok: true, value: null });
  jest.mocked(saveJSON).mockResolvedValue();
});
afterEach(() => { stopAchievementSession(); });

it('updates all consumers and announces a new award without opening the collection screen', async () => {
  const view = await render(<AchievementProvider><Probe /></AchievementProvider>);
  expect(view.getByText('0|true|false')).toBeTruthy();
  await act(async () => captureAchievementRecorder()({ facts: { booksRead: ['b'] } }));
  expect(view.getByText('1|true|false')).toBeTruthy();
  expect(view.getByText('Последняя страница')).toBeTruthy();
  expect(saveJSON).toHaveBeenCalledWith('dvg.achievements.v1.user_a', expect.objectContaining({ unlocked: expect.objectContaining({ 'book-1': expect.any(String) }) }));
  const saves = jest.mocked(saveJSON).mock.calls.length;
  await act(async () => captureAchievementRecorder()({ facts: { booksRead: ['b'] } }));
  expect(saveJSON).toHaveBeenCalledTimes(saves);
});

it('restores a saved award silently and does not award spectators for an active challenge', async () => {
  const stored = emptyAchievementLedger(); stored.unlocked['book-1'] = '2026-01-01T12:00:00Z';
  jest.mocked(readJSON).mockResolvedValue({ ok: true, value: stored });
  const view = await render(<AchievementProvider><Probe /></AchievementProvider>);
  expect(view.getByText('1|true|false')).toBeTruthy();
  expect(view.queryByText('НОВОЕ ДОСТИЖЕНИЕ')).toBeNull();
});

it('queues an action while disk hydration is pending and only loads once', async () => {
  let resolve!: (value: any) => void;
  jest.mocked(readJSON).mockImplementation(() => new Promise(r => { resolve = r; }));
  const view = await render(<AchievementProvider><Probe /></AchievementProvider>);
  await act(async () => captureAchievementRecorder()({ facts: { lessonsDone: ['c:l'] } }));
  expect(saveJSON).not.toHaveBeenCalled();
  await act(async () => resolve({ ok: true, value: emptyAchievementLedger() }));
  expect(view.getByText('1|true|false')).toBeTruthy();
  expect(readJSON).toHaveBeenCalledTimes(1);
});

it('does not overwrite unreadable saved data', async () => {
  jest.mocked(readJSON).mockResolvedValue({ ok: false, value: null });
  const view = await render(<AchievementProvider><Probe /></AchievementProvider>);
  await act(async () => captureAchievementRecorder()({ facts: { lessonsDone: ['c:l'] } }));
  expect(view.getByText('0|false|true')).toBeTruthy();
  expect(saveJSON).not.toHaveBeenCalled();
});

it('sign-out invalidates queued hydration and cannot recreate the erased collection', async () => {
  let resolve!: (value: any) => void;
  jest.mocked(readJSON).mockImplementation(() => new Promise(r => { resolve = r; }));
  await render(<AchievementProvider><Probe /></AchievementProvider>);
  await act(async () => captureAchievementRecorder()({ facts: { lessonsDone: ['c:l'] } }));
  stopAchievementSession();
  await act(async () => resolve({ ok: true, value: emptyAchievementLedger() }));
  expect(saveJSON).not.toHaveBeenCalled();
});

it('silently backfills old approvals, then announces a newly approved event on refresh', async () => {
  const view = await render(<AchievementProvider><Probe /></AchievementProvider>);
  await act(async () => captureAchievementRecorder()({ silent: true, source: 'meetups', facts: { eventsApproved: [] } }));
  expect(view.queryByText('НОВОЕ ДОСТИЖЕНИЕ')).toBeNull();
  await act(async () => captureAchievementRecorder()({ silent: true, source: 'meetups', facts: { eventsApproved: ['meetup:1'] } }));
  expect(view.getByText('Планы с сообществом')).toBeTruthy();
});
