import { anchoredNow, readingPlacedStart, localApproaches, readingDayAt, readingDayEnd, readingLocalView, readingStartMs } from '../readingOffline';
import { readingFixture } from '../../storybook/readingFixtures';
import type { ReadingCommand, ReadingDetail } from '../reading';

const startDate = '2026-10-01';
const at = (day: number, hour: number) => readingStartMs(startDate) + (day - 1) * 86_400_000 + hour * 3_600_000;
const detail: ReadingDetail = { ...readingFixture, mode: 'continuous', startDate, currentDay: 3, dayEnd: readingDayEnd(startDate, 3),
  serverNow: at(3, 9), session: null, todayBooks: [],
  me: { ...readingFixture.me!, pages: 40, elapsedMs: 50 * 60000, history: [{ day: 3, state: 'open', pages: 10, elapsedMs: 50 * 60000 }] } };
const cmd = (action: string, sessionId: string, extra: Record<string, unknown> = {}) =>
  ({ operationId: `${action}-${sessionId}`, challengeId: detail.id, action, sessionId, ...extra }) as unknown as ReadingCommand;

test('days follow Asia/Almaty midnight, not UTC', () => {
  expect(readingStartMs(startDate)).toBe(Date.parse('2026-09-30T19:00:00Z'));
  expect(readingDayAt(startDate, Date.parse('2026-10-01T18:59:59Z'))).toBe(1);
  expect(readingDayAt(startDate, Date.parse('2026-10-01T19:00:00Z'))).toBe(2);
  expect(readingDayEnd(startDate, 1)).toBe(Date.parse('2026-10-01T19:00:00Z'));
});

test('approaches are rebuilt from the queue; other challenges and actions are ignored', () => {
  const list = localApproaches([
    cmd('start', 's1', { book: 'Книга', startedAt: at(3, 22), deviceId: 'phone' }), cmd('stop', 's1', { elapsedMs: 20 * 60000 }),
    cmd('report', 's1', { pages: 7, nextPage: 50 }), cmd('start', 's2', { book: 'Другая', startedAt: at(4, 1) }),
    { ...cmd('start', 'x'), challengeId: 'other' } as ReadingCommand, cmd('apply', 's3'),
  ], detail.id, detail);
  expect(list).toEqual([
    expect.objectContaining({ sessionId: 's1', day: 3, startQueued: true, elapsedMs: 20 * 60000, pages: 7, nextPage: 50, phase: 'saved' }),
    expect.objectContaining({ sessionId: 's2', day: 4, startQueued: true, phase: 'open' }),
  ]);
});

test('a saved approach is added to its own day once; 60 minutes completes the day', () => {
  const approaches = localApproaches([cmd('start', 's1', { book: 'Книга', bookKey: 'ol:1', startedAt: at(3, 10) }),
    cmd('stop', 's1', { elapsedMs: 15 * 60000 }), cmd('report', 's1', { pages: 6 })], detail.id, detail);
  const view = readingLocalView(detail, approaches, at(3, 11), true);
  expect(view.session).toBeNull();
  expect(view.me?.history).toEqual([{ day: 3, state: 'complete', pages: 16, elapsedMs: 65 * 60000 }]);
  expect([view.me?.pages, view.me?.elapsedMs]).toEqual([46, 65 * 60000]);
  expect(view.todayBooks).toEqual([expect.objectContaining({ key: 'ol:1', title: 'Книга', pages: 6, elapsedMs: 15 * 60000 })]);
});

test('an approach started without internet becomes the current session until confirmed', () => {
  const running = readingLocalView(detail, localApproaches([cmd('start', 's1', { book: 'Книга', startedAt: at(3, 10), deviceId: 'phone' })], detail.id, detail), at(3, 10), true);
  expect(running.session).toMatchObject({ id: 's1', status: 'running', day: 3, deviceId: 'phone', budgetMs: 14 * 3_600_000 });
  const stopped = readingLocalView(detail, localApproaches([cmd('start', 's1', { book: 'Книга', startedAt: at(3, 10) }),
    cmd('stop', 's1', { elapsedMs: 9 * 60000 })], detail.id, detail), at(3, 10), true);
  expect(stopped.session).toMatchObject({ id: 's1', status: 'awaiting_pages', elapsedMs: 9 * 60000 });
});

test('stale copy follows the phone clock into the next day; fresh copy keeps server time', () => {
  expect(readingLocalView(detail, [], at(5, 2), true)).toMatchObject({ currentDay: 5, dayEnd: readingDayEnd(startDate, 5), phase: 'active' });
  expect(readingLocalView(detail, [], at(5, 2), false)).toBe(detail);
  const fixed = { ...detail, mode: 'scheduled', durationDays: 4 } as ReadingDetail;
  expect(readingLocalView(fixed, [], at(6, 1), true)).toMatchObject({ currentDay: 4, phase: 'finished' });
});

test('real time is the server anchor + monotonic clock of the same boot', () => {
  const anchor = { serverNow: 1_000_000, uptimeMs: 500, bootId: 'a' };
  expect(anchoredNow(anchor, { uptimeMs: 1_500, bootId: 'a' })).toBe(1_001_000);
  expect(anchoredNow(anchor, { uptimeMs: 1_500, bootId: 'b' })).toBeNull();
  expect(anchoredNow(anchor, { uptimeMs: 100, bootId: 'a' })).toBeNull();
  expect(anchoredNow(null, { uptimeMs: 1_500, bootId: 'a' })).toBeNull();
  expect(anchoredNow(anchor, null)).toBeNull();
});

test('an approach the server copy already counts is not added again; pages-only keeps the server time', () => {
  const commands = [cmd('start', 's1', { book: 'Книга', startedAt: at(3, 10) }), cmd('stop', 's1', { elapsedMs: 15 * 60000 }), cmd('report', 's1', { pages: 6 })];
  const counted = { ...detail, reportedSessionIds: ['s1'], me: { ...detail.me!, history: [{ day: 3, state: 'open' as const, pages: 16, elapsedMs: 65 * 60000 }] } };
  expect(readingLocalView(counted, localApproaches(commands, detail.id, counted), at(3, 11), false).me?.history)
    .toEqual([{ day: 3, state: 'open', pages: 16, elapsedMs: 65 * 60000 }]);
  const stopDelivered = { ...detail, session: { id: 's2', deviceId: 'phone', day: 3, book: 'Книга', author: null, bookKey: null, fromPage: null,
    startedAt: new Date(at(3, 12)).toISOString(), budgetMs: 1, elapsedMs: 10 * 60000, status: 'awaiting_pages' as const } };
  const pagesOnly = localApproaches([cmd('report', 's2', { pages: 3 })], detail.id, stopDelivered);
  expect(pagesOnly[0]).toMatchObject({ elapsedMs: 10 * 60000, pages: 3, phase: 'saved' });
});

test('a start in the last minute of a day belongs to the next day when that day exists', () => {
  expect(readingPlacedStart(detail, at(4, 0) - 30_000)).toBe(at(4, 0));
  expect(readingPlacedStart(detail, at(4, 0) - 90_000)).toBe(at(4, 0) - 90_000);
  const scheduled = { ...detail, mode: 'scheduled', durationDays: 3 } as ReadingDetail;
  expect(readingPlacedStart(scheduled, at(4, 0) - 30_000)).toBe(at(4, 0) - 30_000);
  const view = readingLocalView(detail, localApproaches([cmd('start', 's1', { book: 'Книга', startedAt: at(4, 0) - 30_000 })], detail.id, detail), at(4, 0) - 20_000, true);
  expect(view.session).toMatchObject({ day: 4, budgetMs: 86_400_000 });
});
