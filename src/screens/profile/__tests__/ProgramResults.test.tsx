import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProgramResultScreen } from '../ProgramResultScreen';
import { ProgramHistoryScreen } from '../ProgramHistoryScreen';
import { ProgramResultContent } from '../../../components/ProgramResult';
import { FitnessProgram, programStats } from '../../../data/fitness';
import { programShareCard } from '../../../data/programResults';

let mockDark = false, mockLoaded = true;
let mockPrograms: FitnessProgram[] = [];
let mockDimensions = { width: 375, height: 812, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => mockDimensions }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => {
  const t = jest.requireActual('../../../theme/tokens');
  return { ...t, T: mockDark ? t.darkTheme : t.lightTheme, textScale: 1 };
} }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/ui', () => ({ Button: ({ label, onPress }: any) => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable>;
} }));
jest.mock('../../../state/FitnessContext', () => ({ useFitness: () => ({ programs: mockPrograms, loaded: mockLoaded }) }));
jest.mock('../../../state/useLocalDay', () => ({ useLocalDay: () => '2026-10-01' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn() }));

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
const program: FitnessProgram = { id: 'p', title: 'Отжимания', unit: 'раз', days: 7, target: 50, startKey: '2026-09-01', createdISO: '', remindAt: null, log: { '2026-09-01': 50, '2026-09-02': 20, '2026-09-03': 75 } };
beforeEach(() => { jest.clearAllMocks(); mockPrograms = [program]; mockLoaded = true; mockDark = false; mockDimensions = { width: 375, height: 812, scale: 3, fontScale: 1 }; });

it.each([false, true])('shows truthful results and shares them in dark mode=%s', async dark => {
  mockDark = dark;
  const view = await render(<ProgramResultScreen navigation={navigation} route={{ key: 'r', name: 'ProgramResult', params: { programId: 'p' } }} />);
  expect(view.getByText('Всего за программу')).toBeTruthy();
  expect(view.getByText('Больше цели')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Результаты по дням' }));
  expect(view.getByRole('button', { name: 'Результаты по дням' }).props.accessibilityState.expanded).toBe(true);
  expect(view.getAllByText('Частично выполнено')).toHaveLength(1);
  await fireEvent.press(view.getByRole('button', { name: 'Поделиться результатом' }));
  expect(navigation.navigate).toHaveBeenCalledWith('WorkoutShare', { card: programShareCard(program, programStats(program)) });
});
it.each([[375, 1, '48%'], [320, 1, '100%'], [375, 2, '100%'], [812, 1, '48%']] as const)('reflows metrics at %s width / %s font scale', async (width, fontScale, cellWidth) => {
  mockDimensions = { ...mockDimensions, width, fontScale };
  const view = await render(<ProgramResultContent program={program} stats={programStats(program)} />);
  expect(view.getByTestId('program-stat-Лучшая серия')).toHaveStyle({ width: cellWidth });
});
it('opens a historical result and excludes active programs', async () => {
  mockPrograms.push({ ...program, id: 'future', title: 'Будущая программа', startKey: '2099-01-01' });
  const view = await render(<ProgramHistoryScreen navigation={navigation} route={{ key: 'h', name: 'ProgramHistory' }} />);
  expect(view.queryByText('Будущая программа')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: /Отжимания.*Открыть результаты/ }));
  expect(navigation.navigate).toHaveBeenCalledWith('ProgramResult', { programId: 'p' });
});
it('handles an empty history and a removed program without inventing results', async () => {
  mockPrograms = [];
  const view = await render(<ProgramHistoryScreen navigation={navigation} route={{ key: 'h', name: 'ProgramHistory' }} />);
  expect(view.getByText('Здесь будет ваша история')).toBeTruthy();
  await view.unmount();
  const result = await render(<ProgramResultScreen navigation={navigation} route={{ key: 'r', name: 'ProgramResult', params: { programId: 'gone' } }} />);
  expect(result.getByText('Программа не найдена')).toBeTruthy();
  expect(result.queryByRole('button', { name: 'Поделиться результатом' })).toBeNull();
});
it('does not show a false empty history before hydration', async () => {
  mockPrograms = []; mockLoaded = false;
  const view = await render(<ProgramHistoryScreen navigation={navigation} route={{ key: 'h', name: 'ProgramHistory' }} />);
  expect(view.getByLabelText('Загружаем историю программ')).toBeTruthy();
  expect(view.queryByText('Здесь будет ваша история')).toBeNull();
});
