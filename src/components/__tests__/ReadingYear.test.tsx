import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { ReadingLeaveButton } from '../ReadingLeaveButton';
import { ReadingTimer } from '../ReadingTimer';
import { ReadingStatisticsContent } from '../ReadingStatisticsContent';
import { ReadingJourneyCard } from '../ReadingJourneyCard';
import { ReadingStoryCard } from '../ReadingStoryCard';
import { readingYearHistoryFixture } from '../../storybook/readingFixtures';
import { readingStatistics } from '../../data/readingStatistics';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
test('exit cannot reset on first tap, warning explains the new day one', async () => {
  const leave = jest.fn(), alert = jest.spyOn(Alert, 'alert');
  const v = await render(<ThemePreviewProvider><ReadingLeaveButton busy={false} onLeave={leave} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Покинуть челлендж' }));
  expect(leave).not.toHaveBeenCalled();
  expect(alert.mock.calls[0][1]).toContain('новый день 1');
  expect(alert.mock.calls[0][1]).toContain('будут сброшены');
  alert.mock.calls[0][2]?.find(b => b.style === 'destructive')?.onPress?.();
  expect(leave).toHaveBeenCalledTimes(1); alert.mockRestore();
});
test('Moderate timer counts down from 30 and displays overtime after its own goal', async () => {
  const v = await render(<ThemePreviewProvider><ReadingTimer state="ready" remainingMs={1800000} targetMs={1800000} /></ThemePreviewProvider>);
  expect(v.getByText('30:00')).toBeTruthy(); expect(v.queryByText('60:00')).toBeNull();
  await v.rerender(<ThemePreviewProvider><ReadingTimer state="running" remainingMs={-60000} targetMs={1800000} /></ThemePreviewProvider>);
  expect(v.getByText('+01:00')).toBeTruthy(); expect(v.getByText('Норма выполнена')).toBeTruthy();
});
test('year report shows saved totals and all book states, stories omit unchecked metrics', async () => {
  const data = readingYearHistoryFixture, s = readingStatistics(data);
  expect(s.finished).toHaveLength(2); expect(s.books).toHaveLength(3);
  const v = await render(<ThemePreviewProvider><ReadingStatisticsContent data={data} onShare={() => {}} /></ThemePreviewProvider>);
  expect(v.getByText('Год, который вы прочитали')).toBeTruthy(); expect(v.getByText('Краткая история Японии')).toBeTruthy();
  await v.rerender(<ThemePreviewProvider><ReadingStoryCard data={data} background="paper" metrics={['pages']} bookPage={null} /></ThemePreviewProvider>);
  expect(v.queryByText('красных флагов')).toBeNull(); expect(v.getByText('страниц')).toBeTruthy();
});
test('completed year offers the final report, ongoing year offers statistics', async () => {
  const press = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingJourneyCard period={readingYearHistoryFixture.reader.period} completed onPress={press} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Итоги года чтения' })); expect(press).toHaveBeenCalled();
});

