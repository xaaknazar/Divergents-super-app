import { connectAchievements, stopAchievementSession } from '../achievementEvents';
import { createMeetup, createSport, createTrip, fetchMyMeetups, fetchMySport, fetchMyTrips, markLessonComplete } from '../api';
import { postBookComment, setBookShelf } from '../books';
import { postPlace, postReview } from '../places';
import { postChallengeProgress } from '../community';

const response = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data }) as Response;
const token = `e30.${Buffer.from(JSON.stringify({ sub: 'account' })).toString('base64url')}.test-signature`;
const record = jest.fn();
beforeEach(() => { record.mockClear(); connectAchievements('account', record); });
afterEach(() => { stopAchievementSession(); jest.restoreAllMocks(); });

it('awards lessons only after the server confirms, never from an optimistic completion', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({}, 403)).mockResolvedValueOnce(response({ success: true }));
  expect(await markLessonComplete('c', 'l', token)).toBe(false);
  expect(record).not.toHaveBeenCalled();
  expect(await markLessonComplete('c', 'l', token)).toBe(true);
  expect(record).toHaveBeenCalledWith({ facts: { lessonsDone: ['c:l'] } });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('uses the saved shelf state, not just the button that was tapped', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({}, 500))
    .mockResolvedValueOnce(response({ shelf: { status: 'reading' } }))
    .mockResolvedValueOnce(response({ shelf: { status: 'read' } }));
  await setBookShelf('book', token, 'read');
  expect(record).not.toHaveBeenCalled();
  await setBookShelf('book', token, 'read');
  expect(record).toHaveBeenLastCalledWith({ facts: { booksStarted: ['book'], booksRead: [] } });
  await setBookShelf('book', token, 'read');
  expect(record).toHaveBeenLastCalledWith({ facts: { booksStarted: ['book'], booksRead: ['book'] } });
});

it('only published book reviews qualify, not comments or failed submissions', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ id: 'comment' }))
    .mockResolvedValueOnce(response({}, 403)).mockResolvedValueOnce(response({ id: 'review' }));
  await postBookComment('book', token, 'Текст', 'comment');
  await postBookComment('book', token, 'Текст', 'review');
  expect(record).not.toHaveBeenCalled();
  await postBookComment('book', token, 'Текст', 'review');
  expect(record).toHaveBeenCalledWith({ facts: { bookReviews: ['book'] } });
});

it.each([createTrip, createMeetup, createSport])('awards each type of offline event from a confirmed server ID only', async create => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({}, 400)).mockResolvedValueOnce(response({ ok: true, id: 'new-event' }));
  await create(token, { title: 'Встреча' });
  expect(record).not.toHaveBeenCalled();
  await create(token, { title: 'Встреча' });
  expect(record).toHaveBeenCalledWith({ facts: { eventsCreated: [expect.stringMatching(/:new-event$/)] } });
});

it.each([
  [fetchMyTrips, 'trips', 'trip'], [fetchMyMeetups, 'meetups', 'meetup'], [fetchMySport, 'sport', 'sport'],
] as const)('only approved registrations qualify for %s', async (fetchMine, key, kind) => {
  jest.spyOn(global, 'fetch').mockResolvedValue(response({ [key]: [{ id: 'pending', status: 'pending' }, { id: 'ok', status: 'approved' }, { id: 'no', status: 'rejected' }] }));
  await fetchMine(token);
  expect(record).toHaveBeenCalledWith(expect.objectContaining({ facts: expect.objectContaining({ eventsApproved: [`${kind}:ok`] }) }));
});

it('failed place publication and local-only reviews do not earn a badge', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({}, 403)).mockResolvedValueOnce(response({ id: 'place' })).mockResolvedValueOnce(response({ ok: true }));
  await postPlace({} as any, token);
  expect(record).not.toHaveBeenCalled();
  await postPlace({} as any, token);
  expect(record).toHaveBeenLastCalledWith({ facts: { placesSubmitted: ['place'] } });
  await postReview('place', { rating: 5, text: 'Отлично' }, token);
  expect(record).toHaveBeenLastCalledWith({ facts: { placeReviews: ['place'] } });
});

it('counts saved challenge report days once, not zero/undone/superseded writes', async () => {
  const command = { taskId: 'pages', value: 20, day: 1, expectedVersion: 0, operationId: 'progress-operation-123' };
  const receipt = { ok: true, operationId: command.operationId, challengeId: 'c', taskId: 'pages', day: 1, version: 1, acceptedAt: '2026-10-04T10:00:00.000Z' };
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ value: 0, done: false }))
    .mockResolvedValueOnce(response({ value: 20, superseded: true }))
    .mockResolvedValueOnce(response({ ...receipt, value: 20, done: false }));
  await postChallengeProgress('c', command, token);
  await postChallengeProgress('c', command, token);
  expect(record).not.toHaveBeenCalled();
  await postChallengeProgress('c', command, token);
  expect(record).toHaveBeenCalledWith({ facts: { challengeReports: [expect.stringMatching(/^c:\d{4}-\d{2}-\d{2}$/)] } });
});

it('a successful old-account request cannot award a newly signed-in account', async () => {
  let resolve!: (r: Response) => void;
  jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(r => { resolve = r; }));
  const completion = markLessonComplete('c', 'l', token);
  const other = jest.fn();
  connectAchievements('account-b', other);
  resolve(response({ success: true }));
  expect(await completion).toBe(true);
  expect(record).not.toHaveBeenCalled();
  expect(other).not.toHaveBeenCalled();
});

it('rejects an old token even when getToken resolved after a new account connected', async () => {
  const other = jest.fn();
  connectAchievements('account-b', other);
  jest.spyOn(global, 'fetch').mockResolvedValue(response({ success: true }));
  expect(await markLessonComplete('c', 'l', token)).toBe(true);
  expect(other).not.toHaveBeenCalled();
});
