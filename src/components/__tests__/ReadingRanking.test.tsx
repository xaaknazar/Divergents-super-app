import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingRankingContent } from '../ReadingRankingContent';
import { ReadingRankLink } from '../ReadingRankLink';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { individualReadingFixture } from '../../storybook/readingFixtures';
import { readingStandings } from '../../data/reading';

jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const base = individualReadingFixture.me!;
const ranking = [
  { ...base, userId: 'steady', name: 'Постоянный читатель', pages: 800, averagePages: 40, daysParticipated: 20 },
  { ...base, userId: 'fast', name: 'Быстрый читатель', pages: 100, averagePages: 100, daysParticipated: 1 },
];
const data = { ...individualReadingFixture, ranking, me: ranking[1], participants: 2 };

test('switching metrics changes places, keeps both numbers and opens the same reader history', async () => {
  const onHistory = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingRankingContent data={data} onHistory={onHistory} /></ThemePreviewProvider>);
  expect(v.getByRole('radio', { name: 'Средний темп' }).props.accessibilityState.selected).toBe(true);
  expect(v.getAllByRole('button')[0].props.accessibilityLabel).toMatch(/^1 место\. Быстрый читатель/);
  expect(v.getByRole('button', { name: /1 место\. Быстрый читатель/ }).props.accessibilityLabel).toContain('всего прочитано 100 страниц');
  await fireEvent.press(v.getByRole('radio', { name: 'Всего страниц' }));
  expect(v.getByRole('radio', { name: 'Всего страниц' }).props.accessibilityState.selected).toBe(true);
  const first = v.getAllByRole('button')[0];
  expect(first.props.accessibilityLabel).toMatch(/^1 место\. Постоянный читатель/);
  expect(first.props.accessibilityLabel).toContain('средний темп 40 стр/день');
  await fireEvent.press(first);
  expect(onHistory).toHaveBeenCalledWith('steady');
  await fireEvent.press(v.getByRole('radio', { name: 'Средний темп' }));
  expect(v.getAllByRole('button')[0].props.accessibilityLabel).toMatch(/^1 место\. Быстрый читатель/);
});
test('selected mode survives server refresh and recalculates the full order', async () => {
  const v = await render(<ThemePreviewProvider><ReadingRankingContent data={data} onHistory={() => {}} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('radio', { name: 'Всего страниц' }));
  const updated = { ...data, ranking: [ranking[0], { ...ranking[1], pages: 900 }] };
  await v.rerender(<ThemePreviewProvider><ReadingRankingContent data={updated} onHistory={() => {}} /></ThemePreviewProvider>);
  expect(v.getByRole('radio', { name: 'Всего страниц' }).props.accessibilityState.selected).toBe(true);
  expect(v.getAllByRole('button')[0].props.accessibilityLabel).toMatch(/^1 место\. Быстрый читатель/);
});
test('my ranking distinguishes both places from the same full ranking and keeps navigation', async () => {
  const pace = readingStandings(ranking).find(r => r.member.userId === 'fast')!.place;
  const pages = readingStandings(ranking, 'pages').find(r => r.member.userId === 'fast')!.place;
  const onPress = jest.fn();
  const v = await render(<ThemePreviewProvider textSize="xl"><ReadingRankLink place={pace} pagesPlace={pages} participants={2} onPress={onPress} /></ThemePreviewProvider>);
  const button = v.getByRole('button', { name: 'Мой рейтинг. По среднему темпу: 1 место из 2 участников. По страницам: 2 место из 2 участников' });
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});
test('empty list works in either mode and never pretends there are ranked participants', async () => {
  const v = await render(<ThemePreviewProvider><ReadingRankingContent data={{ ...data, ranking: [], me: null }} initialMetric="pages" /></ThemePreviewProvider>);
  expect(v.getByText('Пока никто не вступил. Первые участники появятся здесь.')).toBeTruthy();
  expect(v.getByRole('radio', { name: 'Всего страниц' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(v.getByRole('radio', { name: 'Средний темп' }));
  expect(v.getByText('Пока никто не вступил. Первые участники появятся здесь.')).toBeTruthy();
});
