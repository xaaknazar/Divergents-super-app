import { nextReadingDate, readingDateError, readingDateStart, ReadingChallengeDraftSchema } from '../readingCreation';
test('Kazakhstan tomorrow does not depend on phone timezone and rolls over at 19:00 UTC', () => {
  expect(nextReadingDate(Date.parse('2026-10-19T18:59:59Z'))).toBe('2026-10-20');
  expect(nextReadingDate(Date.parse('2026-10-19T19:00:00Z'))).toBe('2026-10-21');
  expect(readingDateStart('2026-10-20')).toBe(Date.parse('2026-10-19T19:00:00Z'));
  expect(nextReadingDate(Date.parse('2026-12-31T19:00:00Z'))).toBe('2027-01-02');
});
test('invalid dates and a date that just started are rejected', () => {
  const now = Date.parse('2026-10-19T19:00:00Z');
  expect(readingDateError('2026-10-20', now)).toContain('завтрашнего');
  expect(readingDateError('2026-10-21', now)).toBeUndefined();
  for (const date of ['2026-02-30', '2026-13-01', '', '20.10.2026']) expect(readingDateError(date, now)).toBeTruthy();
});
test('draft limits match the server contract', () => {
  const valid = { title: 'Читаем', startDate: '2099-01-01', durationDays: 90, teams: [{ name: 'Клуб', captainNickname: 'Reader', capacity: 100 }] };
  expect(ReadingChallengeDraftSchema.safeParse(valid).success).toBe(true);
  for (const patch of [{ title: 'x'.repeat(121) }, { durationDays: 91 }, { teams: [] }, { teams: [{ ...valid.teams[0], capacity: 101 }] }]) {
    expect(ReadingChallengeDraftSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  }
});
test('continuous clubs can start today but not before the Kazakhstan calendar day', () => {
  const now = Date.parse('2026-10-19T19:00:00Z');
  expect(readingDateError('2026-10-20', now, 'continuous')).toBeUndefined();
  expect(readingDateError('2026-10-19', now, 'continuous')).toBeTruthy();
  expect(readingDateError('2026-02-30', now, 'continuous')).toBeTruthy();
});
