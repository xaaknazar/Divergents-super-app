import { act, renderHook, waitFor } from '@testing-library/react-native';
import { fetchChallengeSeasons } from '../../data/challengeSeasons';
import { useChallengeSeasons, SEASONS_DEADLINE_MS } from '../useChallengeSeasons';

let mockUserId: string | null = 'reader';
let mockTokenVersion = 0;
const mockToken = jest.fn();
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockUserId,
  // Clerk may return a new function when its authentication state changes.
  getToken: mockTokenVersion ? () => mockToken() : mockToken,
}) }));
jest.mock('../../data/challengeSeasons', () => ({ fetchChallengeSeasons: jest.fn() }));
const fetchSeasons = jest.mocked(fetchChallengeSeasons);
const seasons = [{ id: 'season3', title: 'Season 3', season: 3, startISO: null, finished: false }];
beforeEach(() => {
  mockUserId = 'reader'; mockTokenVersion = 0;
  mockToken.mockReset().mockResolvedValue('token'); fetchSeasons.mockReset().mockResolvedValue(seasons);
});
afterEach(() => jest.useRealTimers());

it('finishes loading once even when getToken changes on every render', async () => {
  mockTokenVersion = 1;
  const h = await renderHook(() => useChallengeSeasons('season3'));
  await act(async () => h.result.current.setOpen(true));
  await waitFor(() => expect(h.result.current.seasons).toEqual(seasons));
  await h.rerender(undefined);
  expect(h.result.current.loading).toBe(false);
  expect(fetchSeasons).toHaveBeenCalledTimes(1);
});

it('stops waiting for a hanging token and allows an explicit retry', async () => {
  jest.useFakeTimers(); mockToken.mockReturnValueOnce(new Promise(() => {}));
  const h = await renderHook(() => useChallengeSeasons('season3'));
  await act(async () => h.result.current.setOpen(true));
  expect(h.result.current.loading).toBe(true);
  await act(async () => { await jest.advanceTimersByTimeAsync(SEASONS_DEADLINE_MS); });
  expect(h.result.current.loading).toBe(false); expect(h.result.current.error).toBe(true);
  await act(async () => h.result.current.retry());
  expect(h.result.current.seasons).toEqual(seasons); expect(h.result.current.error).toBe(false);
});

it('cancels a closed sheet, ignores its late response and reloads on reopening', async () => {
  let finish!: (value: typeof seasons) => void;
  fetchSeasons.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(() => useChallengeSeasons('season3'));
  await act(async () => h.result.current.setOpen(true));
  const signal = fetchSeasons.mock.calls[0][1]!;
  await act(async () => h.result.current.setOpen(false));
  expect(signal.aborted).toBe(true); expect(h.result.current.loading).toBe(false);
  await act(async () => finish(seasons));
  expect(h.result.current.seasons).toEqual([]);
  await act(async () => h.result.current.setOpen(true));
  expect(h.result.current.seasons).toEqual(seasons); expect(h.result.current.loading).toBe(false);
});

it('clears previous account data and ignores its pending request', async () => {
  let finish!: (value: typeof seasons) => void;
  fetchSeasons.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(() => useChallengeSeasons('season3'));
  await act(async () => h.result.current.setOpen(true));
  mockUserId = 'other'; await h.rerender(undefined);
  await act(async () => finish(seasons));
  expect(h.result.current.seasons).toEqual([]); expect(h.result.current.open).toBe(false);
  expect(h.result.current.loading).toBe(false);
});

it('keeps already loaded seasons on a failed refresh and ends the spinner', async () => {
  const h = await renderHook(() => useChallengeSeasons('season3'));
  await act(async () => h.result.current.setOpen(true));
  fetchSeasons.mockRejectedValue(new Error('offline'));
  await act(async () => h.result.current.retry());
  expect(h.result.current.seasons).toEqual(seasons);
  expect(h.result.current.error).toBe(true); expect(h.result.current.loading).toBe(false);
});
