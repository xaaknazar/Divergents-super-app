import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useChallengeResults } from '../useChallengeResults';
import { fetchChallengeResults } from '../../data/community';
import { finalResultsFixture } from '../../storybook/challengeResultsFixtures';
import type { ChallengeResults } from '../../data/community';
import { challengeReadCache } from '../challengeReadCache';
jest.mock('../persist', () => ({ loadJSON: jest.fn(async () => []), saveJSON: jest.fn(async () => {}), clearKeys: jest.fn(async () => {}) }));

const mockGetToken = jest.fn(async () => 'test-token');
let mockAccount = 'owner';
// Clerk Expo wraps getToken in a NEW function on every render. A stable mock
// concealed the request loop in build 88; keep the real identity behaviour.
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: !!mockAccount, userId: mockAccount, getToken: () => mockGetToken() }) }));
jest.mock('../../data/community', () => ({ fetchChallengeResults: jest.fn() }));
const fetchResults = jest.mocked(fetchChallengeResults);
const resultsFor = (id: string): ChallengeResults => ({ ...finalResultsFixture, challenge: { ...finalResultsFixture.challenge, id } });
beforeEach(async () => { await challengeReadCache.reset(); mockAccount = 'owner'; jest.clearAllMocks(); fetchResults.mockReset(); });

it('loads the requested completed challenge, not an active-challenge context', async () => {
  fetchResults.mockResolvedValue(resultsFor('old-season'));
  const { result } = await renderHook(() => useChallengeResults('old-season'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(fetchResults).toHaveBeenCalledWith('old-season', 'test-token', expect.objectContaining({ view: 'summary' }));
  expect(result.current.data?.challenge.id).toBe('old-season');
  expect(fetchResults).toHaveBeenCalledTimes(1);
});
it('does not restart reads when Clerk changes getToken identity on a rerender', async () => {
  fetchResults.mockResolvedValue(resultsFor('season'));
  const { result, rerender } = await renderHook(() => useChallengeResults('season'));
  await waitFor(() => expect(result.current.data?.challenge.id).toBe('season'));
  for (let i = 0; i < 5; i++) await rerender({});
  expect(fetchResults).toHaveBeenCalledTimes(1);
});
it('shares results with the ratings screen and fetches daily history separately', async () => {
  fetchResults.mockResolvedValue(resultsFor('season'));
  const first = await renderHook(() => useChallengeResults('season'));
  await waitFor(() => expect(first.result.current.data).not.toBeNull());
  const ratings = await renderHook(() => useChallengeResults('season'));
  expect(ratings.result.current.data?.challenge.id).toBe('season');
  expect(fetchResults).toHaveBeenCalledTimes(1);
  const days = await renderHook(() => useChallengeResults('season', 'days'));
  await waitFor(() => expect(days.result.current.data).not.toBeNull());
  expect(fetchResults).toHaveBeenCalledTimes(2);
  expect(fetchResults).toHaveBeenLastCalledWith('season', 'test-token', expect.objectContaining({ view: 'days' }));
});
it('ignores late responses from another challenge', async () => {
  let resolveFirst!: (data: ChallengeResults) => void;
  fetchResults.mockImplementation(id => id === 'first' ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve(resultsFor(id)));
  const { result, rerender } = await renderHook<ReturnType<typeof useChallengeResults>, { id: string }>(
    ({ id }) => useChallengeResults(id), { initialProps: { id: 'first' } });
  await waitFor(() => expect(fetchResults).toHaveBeenCalledWith('first', 'test-token', expect.objectContaining({ view: 'summary' })));
  await rerender({ id: 'second' });
  await waitFor(() => expect(result.current.data?.challenge.id).toBe('second'));
  await act(async () => { resolveFirst(resultsFor('first')); });
  expect(result.current.data?.challenge.id).toBe('second');
});
it('does not expose the previous account results after signing out', async () => {
  fetchResults.mockImplementation((_id, token) => Promise.resolve(token ? resultsFor('season') : null));
  const { result, rerender } = await renderHook(() => useChallengeResults('season'));
  await waitFor(() => expect(result.current.data).not.toBeNull());
  mockAccount = '';
  await rerender({});
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toBeNull(); expect(result.current.error).toBe(true);
});
it('keeps previously loaded results and reports a failed refresh; retry recovers', async () => {
  fetchResults.mockResolvedValueOnce(resultsFor('season')).mockResolvedValueOnce(null).mockResolvedValueOnce(resultsFor('season'));
  const { result } = await renderHook(() => useChallengeResults('season'));
  await waitFor(() => expect(result.current.data).not.toBeNull());
  await act(async () => { await result.current.reload(); });
  expect(result.current.error).toBe(true); expect(result.current.data?.challenge.id).toBe('season');
  await act(async () => { await result.current.reload(); });
  expect(result.current.error).toBe(false);
});
it('rejects a response for the wrong challenge rather than showing unrelated rankings', async () => {
  fetchResults.mockResolvedValue(resultsFor('wrong-season'));
  const { result } = await renderHook(() => useChallengeResults('requested-season'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toBeNull(); expect(result.current.error).toBe(true);
});
