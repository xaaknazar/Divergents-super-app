import { ReadingDetail, readingStandings } from '../reading';
import { individualReadingFixture } from '../../storybook/readingFixtures';

jest.mock('../api', () => ({ API_BASE: 'https://example.test' }));
type Member = ReadingDetail['ranking'][number];
const reader = (userId: string, pages: number, averagePages: number, daysParticipated: number): Member => ({
  ...individualReadingFixture.me!, userId, name: userId, pages, averagePages, daysParticipated,
});

test('two rankings have independent leaders while pace remains the default', () => {
  const ranking = [reader('steady', 800, 40, 20), reader('fast', 100, 100, 1), reader('third', 600, 30, 20)];
  expect(readingStandings(ranking).map(r => [r.member.userId, r.place])).toEqual([['fast', 1], ['steady', 2], ['third', 3]]);
  expect(readingStandings(ranking, 'pages').map(r => [r.member.userId, r.place])).toEqual([['steady', 1], ['third', 2], ['fast', 3]]);
});
test('total pages uses server totals, not today, minutes, shelf totals or history sums', () => {
  const ranking = [
    { ...reader('all-days', 900, 30, 30), elapsedMs: 1, history: [] },
    { ...reader('today', 20, 20, 1), elapsedMs: 99999999, history: [{ day: 1, state: 'open' as const, pages: 99999, elapsedMs: 99999999 }] },
  ];
  expect(readingStandings(ranking, 'pages').map(r => r.member.userId)).toEqual(['all-days', 'today']);
});
test('total ties use exact pace, then participation, then stable identity without mutating input', () => {
  const ranking = [reader('b', 100, 10.01, 100), reader('a', 100, 10.04, 1), reader('d', 100, 10.04, 2), reader('c', 100, 10.04, 2)];
  const original = JSON.stringify(ranking);
  for (const metric of ['pace', 'pages'] as const) {
    expect(readingStandings(ranking, metric).map(r => r.member.userId)).toEqual(['c', 'd', 'a', 'b']);
    expect(readingStandings([...ranking].reverse(), metric).map(r => r.member.userId)).toEqual(['c', 'd', 'a', 'b']);
  }
  expect(JSON.stringify(ranking)).toBe(original);
});
test('newcomers and zero totals are not filtered by retired ten-day/review fields', () => {
  const ranking = [reader('reader', 100, 10, 10), { ...reader('new', 120, 120, 1),
    rankingEligible: false, rankingPending: true, qualificationDaysLeft: 9 }, reader('zero', 0, 0, 1)];
  expect(readingStandings(ranking, 'pages').map(r => [r.member.userId, r.place])).toEqual([['new', 1], ['reader', 2], ['zero', 3]]);
  expect(readingStandings([], 'pages')).toEqual([]);
});
test('legacy members without average pace still rank by the explicit saved page total', () => {
  const ranking = [reader('small', 15, 10, 1), { ...reader('large', 40, 0, 1), averagePages: undefined, daysParticipated: undefined }];
  expect(readingStandings(ranking, 'pages')[0].member.userId).toBe('large');
});
