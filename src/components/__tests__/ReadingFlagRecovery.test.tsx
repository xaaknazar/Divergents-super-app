import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingFlagRecovery } from '../ReadingFlagRecovery';
import { ReadingProgressSummary } from '../ReadingProgressSummary';
import { ReadingDiary } from '../ReadingDiary';
import { ReadingRules } from '../ReadingRules';
import { ReadingRankingContent } from '../ReadingRankingContent';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { individualReadingFixture } from '../../storybook/readingFixtures';
import { ReadingDetailSchema, readingStandings } from '../../data/reading';
import { ReadingHistorySchema } from '../../data/readingBooks';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const recovery = { requiredDays: 5, progressDays: 3, daysRemaining: 2, earnedFlags: 2, forgivenFlags: 1 };
const me = { ...individualReadingFixture.me!, flags: 1, flagRecovery: recovery };

test('the server owns the recovery count; both detail and history preserve audit metadata', () => {
  const member = { ...me, history: [
    { day: 1, state: 'missed', pages: 12, elapsedMs: 60000, flagForgivenOn: 6 },
    { day: 6, state: 'complete', pages: 20, elapsedMs: 3600000, flagForgivenForDay: 1 },
  ] };
  const detail = ReadingDetailSchema.parse({ ...individualReadingFixture, flagRecoveryDays: 5, me: member, ranking: [member] });
  expect(detail.flagRecoveryDays).toBe(5); expect(detail.me?.flags).toBe(1);
  expect(detail.me?.flagRecovery).toEqual(recovery);
  expect(detail.me?.history[0].flagForgivenOn).toBe(6);
  const history = ReadingHistorySchema.parse({ challengeId: 'c', own: true, reader: member, books: [] });
  expect(history.reader.flagRecovery).toEqual(recovery);
  expect(history.reader.history[1].flagForgivenForDay).toBe(1);
});
test('legacy API/cache remains readable without inventing a flag discount', () => {
  const legacy = ReadingDetailSchema.parse(individualReadingFixture);
  expect(legacy.me?.flagRecovery).toBeUndefined(); expect(legacy.flagRecoveryDays).toBeUndefined();
  expect(legacy.me?.flags).toBe(individualReadingFixture.me?.flags);
});
test('progress is visible, accessible and distinguishes existing flags from forgiven ones', async () => {
  const v = await render(<ThemePreviewProvider><ReadingFlagRecovery flags={1} recovery={recovery} /></ThemePreviewProvider>);
  expect(v.getByText('Дней подряд: 3 из 5')).toBeTruthy();
  expect(v.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 5, now: 3 });
  expect(v.getByText('Снято флагов за серии: 1')).toBeTruthy();
});
test('no negative balance or banked-reward promise appears when all flags are forgiven', async () => {
  const v = await render(<ThemePreviewProvider><ReadingFlagRecovery flags={0}
    recovery={{ ...recovery, progressDays: 0, daysRemaining: 0, forgivenFlags: 2 }} /></ThemePreviewProvider>);
  expect(v.getByText('Красных флагов нет')).toBeTruthy(); expect(v.queryByRole('progressbar')).toBeNull();
  expect(v.getByText(/Списания не копятся на будущее/)).toBeTruthy();
});
test('summary advertises recovery only when the server supports it', async () => {
  const v = await render(<ThemePreviewProvider><ReadingProgressSummary member={individualReadingFixture.me!} /></ThemePreviewProvider>);
  expect(v.queryByText('Снимите один красный флаг')).toBeNull();
  await v.rerender(<ThemePreviewProvider><ReadingProgressSummary member={me} /></ThemePreviewProvider>);
  expect(v.getByText('Дней подряд: 3 из 5')).toBeTruthy();
});
test('diary retains missed time/pages and explains forgiveness using personal day numbers', async () => {
  const v = await render(<ThemePreviewProvider><ReadingDiary member={{ ...me, flags: 0, firstDay: 4, history: [
    { day: 4, state: 'missed', pages: 12, elapsedMs: 600000, flagForgivenOn: 9 },
    { day: 9, state: 'complete', pages: 20, elapsedMs: 3600000, flagForgivenForDay: 4 },
  ] }} /></ThemePreviewProvider>);
  expect(v.getByText('Флаг снят')).toBeTruthy(); expect(v.getByText('10 мин · 12 стр.')).toBeTruthy();
  expect(v.getByText('Снят за серию чтения в день 6. Пропуск остался в истории.')).toBeTruthy();
  expect(v.getByText('За серию чтения снят флаг за день 1.')).toBeTruthy();
});
test('new rules and ranking explain five-day recovery; old-server rules make no false promise', async () => {
  const v = await render(<ThemePreviewProvider><ReadingRules variant="list" /></ThemePreviewProvider>);
  expect(v.queryByText('Красные флаги и их снятие')).toBeNull();
  await v.rerender(<ThemePreviewProvider><ReadingRules variant="list" flagRecoveryDays={5} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: /Красные флаги и их снятие/ }));
  expect(v.getByText(/За каждые 5 дней подряд/)).toBeTruthy();
  await v.rerender(<ThemePreviewProvider><ReadingRankingContent data={{ ...individualReadingFixture, flagRecoveryDays: 5 }} /></ThemePreviewProvider>);
  expect(v.getByText(/Здесь показаны оставшиеся флаги/)).toBeTruthy();
});
test('recovery never changes average pace, page totals or ranking order on the client', () => {
  for (const metric of ['pace', 'pages'] as const) {
    const before = readingStandings(individualReadingFixture.ranking, metric).map(r => r.member.userId);
    const after = readingStandings(individualReadingFixture.ranking.map(m => ({ ...m, flags: 0, flagRecovery: recovery })), metric).map(r => r.member.userId);
    expect(after).toEqual(before);
  }
});
