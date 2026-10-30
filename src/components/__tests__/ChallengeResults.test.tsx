import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { finalResultsFixture } from '../../storybook/challengeResultsFixtures';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { ChallengeResultsContent } from '../ChallengeResultsContent';
import { ChallengeResultMetrics } from '../ChallengeResultMetrics';
import { ChallengeFinalStandingsContent } from '../ChallengeFinalStandingsContent';
import { ChallengeResultRankingRow } from '../ChallengeResultRankingRow';
import { ChallengeTeamResultsRanking } from '../ChallengeTeamResultsRanking';

let mockDimensions = { width: 390, height: 844, fontScale: 1, scale: 3 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => mockDimensions }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn(), hSuccess: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
const theme = (children: React.ReactNode, scheme: 'light' | 'dark' = 'light') => <ThemePreviewProvider scheme={scheme}>{children}</ThemePreviewProvider>;
beforeEach(() => { mockDimensions = { width: 390, height: 844, fontScale: 1, scale: 3 }; });

type Assert<T extends true> = T;
type Sealed<C extends React.ComponentType<any>> = Extract<keyof React.ComponentProps<C>, 'style' | 'className' | 'padding' | 'color' | 'backgroundColor'> extends never ? true : false;
type MetricsContract = Assert<Sealed<typeof ChallengeResultMetrics>>;
type RowContract = Assert<Sealed<typeof ChallengeResultRankingRow>>;
type TeamContract = Assert<Sealed<typeof ChallengeTeamResultsRanking>>;
type StandingsContract = Assert<Sealed<typeof ChallengeFinalStandingsContent>>;

it.each(['light', 'dark'] as const)('stretches all metric cards equally with full labels in %s', async scheme => {
  const view = await render(theme(<ChallengeResultMetrics pages={365} steps={165657} sugarDays={15} />, scheme));
  expect(StyleSheet.flatten(view.getByTestId('result-metrics-layout').props.style)).toMatchObject({ flexDirection: 'row', alignItems: 'stretch' });
  const styles = ['reading', 'walking', 'sugar'].map(kind => StyleSheet.flatten(view.getByTestId(`result-metric-${kind}`).props.style));
  expect(styles[0]).toEqual(styles[1]); expect(styles[1]).toEqual(styles[2]);
  expect(styles[0].flexGrow).toBe(1);
  expect(view.getByLabelText('15 дней без сахара')).toBeTruthy();
});
it.each([{ width: 320, fontScale: 1 }, { width: 390, fontScale: 2 }])('stacks metrics without clipping at %j', async size => {
  mockDimensions = { ...mockDimensions, ...size };
  const view = await render(theme(<ChallengeResultMetrics pages={365} steps={165657} sugarDays={15} />));
  expect(StyleSheet.flatten(view.getByTestId('result-metrics-layout').props.style).flexDirection).toBe('column');
});
it('opens final ratings and days and shows only its own complete team at the bottom', async () => {
  const onOpenStandings = jest.fn(); const onOpenDays = jest.fn();
  const view = await render(theme(<ChallengeResultsContent data={finalResultsFixture} onOpenDays={onOpenDays} onOpenStandings={onOpenStandings} />));
  await fireEvent.press(view.getByRole('button', { name: 'Итоговые рейтинги' }));
  await fireEvent.press(view.getByRole('button', { name: 'По дням' }));
  expect(onOpenStandings).toHaveBeenCalledTimes(1); expect(onOpenDays).toHaveBeenCalledTimes(1);
  expect(view.getByTestId('result-ranking-member-me')).toBeTruthy();
  expect(view.getByTestId('result-ranking-member-left')).toBeTruthy();
  expect(view.getByTestId('result-ranking-member-eliminated')).toBeTruthy();
  expect(view.queryByTestId('result-ranking-member-leader')).toBeNull();
  expect(view.queryByText('Лучшие в общем зачёте')).toBeNull();
  expect(view.getByTestId('result-ranking-member-me').props.accessibilityLabel).toMatch(/^1 место/);
  await view.rerender(theme(<ChallengeResultsContent data={finalResultsFixture} compact onOpenStandings={onOpenStandings} />));
  expect(view.queryByRole('button', { name: 'Итоговые рейтинги' })).toBeNull();
});
it('offers exactly two final rankings, preserves server points and does not hide departed participants', async () => {
  const view = await render(theme(<ChallengeFinalStandingsContent data={finalResultsFixture} />));
  expect(view.getAllByRole('tab')).toHaveLength(2);
  expect(view.getByTestId('result-ranking-team-mine').props.accessibilityLabel).toContain('824 баллов');
  await fireEvent.press(view.getByRole('tab', { name: 'Рейтинг всех участников' }));
  expect(view.getByTestId('result-ranking-member-me').props.accessibilityLabel).toMatch(/^2 место/);
  expect(view.getByTestId('result-ranking-member-left').props.accessibilityLabel).toContain('48 баллов');
  expect(view.getByTestId('result-ranking-member-eliminated').props.accessibilityLabel).toContain('0 баллов');
  expect(view.getByTestId('result-ranking-member-leader')).toBeTruthy();
});
it('offers retry instead of fabricated zero totals on an empty result list', async () => {
  const retry = jest.fn();
  const view = await render(theme(<ChallengeFinalStandingsContent data={{ ...finalResultsFixture, teams: [], overall: [] }} onRefresh={retry} />));
  await fireEvent.press(view.getByRole('button', { name: 'Обновить' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
