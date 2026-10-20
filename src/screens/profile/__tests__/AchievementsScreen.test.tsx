import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AchievementsScreen } from '../AchievementsScreen';
import { computeAchievements, useAchievements } from '../../../data/achievements';
import { navigationRef } from '../../../navigation/ref';

let mockDark = false;
let mockDimensions = { width: 375, height: 812, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => mockDimensions }));
jest.mock('../../../data/achievements', () => ({ ...jest.requireActual('../../../data/achievementCatalog'), useAchievements: jest.fn() }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => {
  const tokens = jest.requireActual('../../../theme/tokens');
  return { ...tokens, T: mockDark ? tokens.darkTheme : tokens.lightTheme, isDark: mockDark };
} }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/Screen', () => ({ Screen: ({ children }: any) => <>{children}</> }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('../../../navigation/ref', () => ({ navigationRef: { isReady: () => true, navigate: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }) }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));

const navigation = { goBack: jest.fn() } as any;
beforeEach(() => {
  jest.clearAllMocks(); mockDark = false; mockDimensions = { width: 375, height: 812, scale: 3, fontScale: 1 };
  const badges = computeAchievements({});
  jest.mocked(useAchievements).mockReturnValue({ badges, total: badges.length, earned: 0, ready: true, storageError: false, refresh: jest.fn(async () => {}) });
});

it.each([false, true])('filters a collection and opens conditions in the %s dark theme', async dark => {
  mockDark = dark;
  const view = await render(<AchievementsScreen navigation={navigation} route={{ key: 'a', name: 'Achievements' }} />);
  await fireEvent.press(view.getByRole('button', { name: 'Выбрать направление' }));
  await fireEvent.press(view.getByRole('button', { name: 'Материалы' }));
  const tile = view.getByRole('button', { name: /За кадром урока\. Прогресс/ });
  await fireEvent.press(tile);
  expect(view.getByText('Открой дополнительный материал к уроку.')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Перейти в раздел' }));
  expect(navigationRef.navigate).toHaveBeenCalledWith('Tabs', expect.objectContaining({ screen: 'LMSTab' }));
});

it('shows a useful earned-empty state and keeps filters accessible', async () => {
  const view = await render(<AchievementsScreen navigation={navigation} route={{ key: 'a', name: 'Achievements' }} />);
  await fireEvent.press(view.getByRole('button', { name: 'Полученные' }));
  expect(view.getByText('Здесь будут твои награды')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Полученные' }).props.accessibilityState.selected).toBe(true);
});

it('keeps a permanent award visible after source progress is temporarily unavailable', async () => {
  const badges = computeAchievements({}, { 'first-step': '2026-09-23T12:00:00Z' });
  jest.mocked(useAchievements).mockReturnValue({ badges, total: badges.length, earned: 1, ready: true, storageError: false, refresh: jest.fn(async () => {}) });
  const view = await render(<AchievementsScreen navigation={navigation} route={{ key: 'a', name: 'Achievements' }} />);
  await fireEvent.press(view.getByRole('button', { name: /Первый шаг\. Получено/ }));
  expect(view.getByText('Достижение получено')).toBeTruthy();
  expect(view.getByText(/В коллекции с/)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Скрыть условия' }));
  expect(view.queryByText('Достижение получено')).toBeNull();
});

it.each([[375, 2, 1], [320, 1, 1], [812, 1, 3]] as const)('adapts %s width and %s font scale to %s columns', async (width, fontScale, columns) => {
  mockDimensions = { width, height: 812, scale: 3, fontScale };
  const view = await render(<AchievementsScreen navigation={navigation} route={{ key: 'a', name: 'Achievements' }} />);
  expect(view.getByTestId('achievement-cell-first-step').props.style.width).toBe((Math.min(width - 32, 760) - (columns - 1) * 12) / columns);
  await fireEvent.press(view.getByRole('button', { name: /Первый шаг\. Прогресс/ }));
  expect(view.getByRole('button', { name: 'Перейти в раздел' })).toBeTruthy();
});

it('offers recovery from an earned-empty category without losing the chosen direction', async () => {
  const view = await render(<AchievementsScreen navigation={navigation} route={{ key: 'a', name: 'Achievements' }} />);
  await fireEvent.press(view.getByRole('button', { name: 'Выбрать направление' }));
  await fireEvent.press(view.getByRole('button', { name: 'Материалы' }));
  await fireEvent.press(view.getByRole('button', { name: 'Полученные' }));
  await fireEvent.press(view.getByRole('button', { name: 'Посмотреть доступные' }));
  expect(view.getByRole('button', { name: /За кадром урока\. Прогресс/ })).toBeTruthy();
  expect(view.queryByRole('button', { name: /Первый шаг\. Прогресс/ })).toBeNull();
});

it('does not display unearned badges as real data while storage is unavailable; retry has an explicit action', async () => {
  const refresh = jest.fn(async () => {});
  jest.mocked(useAchievements).mockReturnValue({ badges: computeAchievements({}), earned: 0, total: 50, ready: false, storageError: true, refresh });
  const view = await render(<AchievementsScreen navigation={navigation} route={{ key: 'a', name: 'Achievements' }} />);
  expect(view.queryByRole('button', { name: /Первый шаг\. Прогресс/ })).toBeNull();
  expect(view.queryByText('Получено 0 из 50 достижений')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Повторить загрузку' }));
  expect(refresh).toHaveBeenCalledTimes(1);
});
