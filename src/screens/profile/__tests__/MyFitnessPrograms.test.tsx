import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MyFitnessScreen } from '../MyFitnessScreen';
import { FitnessProgram } from '../../../data/fitness';

let mockPrograms: FitnessProgram[] = [];
const mockLog = jest.fn();
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => {
  const t = jest.requireActual('../../../theme/tokens');
  return { ...t, T: t.lightTheme, textScale: 1 };
} }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/RouteThumb', () => ({ RouteThumb: () => null }));
jest.mock('../../../components/ui', () => {
  const { View, Pressable, Text } = jest.requireActual('react-native');
  return {
    ListSection: ({ children }: any) => <View>{children}</View>,
    ProgressBar: () => null, Chip: () => null,
    Button: ({ label, onPress }: any) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable>,
  };
});
jest.mock('../../../state/ActivityContext', () => ({ useActivities: () => ({ workouts: [] }) }));
jest.mock('../../../state/FitnessContext', () => ({ useFitness: () => ({
  programs: mockPrograms, goals: [], metrics: [], records: { totalM: 0, weekM: 0, runs: 0, walks: 0 }, logProgram: mockLog,
}) }));
jest.mock('../../../state/useLocalDay', () => ({ useLocalDay: () => '2026-09-07' }));
jest.mock('../../../state/LanguageContext', () => ({ tr: (s: string) => s }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSuccess: jest.fn(), hSelect: jest.fn() }));
const navigation = { navigate: jest.fn(), goBack: jest.fn() } as any;
const route = { key: 'fitness', name: 'MyFitness' as const };
const program: FitnessProgram = { id: 'p', title: 'Отжимания', unit: 'раз', days: 7, target: 50, startKey: '2026-09-01', createdISO: '', remindAt: null, log: {} };
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-07T12:00:00'));
  jest.clearAllMocks(); mockPrograms = [program];
});
afterEach(() => jest.useRealTimers());

it('opens results immediately after the final quick mark', async () => {
  const view = await render(<MyFitnessScreen navigation={navigation} route={route} />);
  await fireEvent.press(view.getByRole('button', { name: 'Сделал: Отжимания' }));
  expect(mockLog).toHaveBeenCalledWith('p', 50);
  expect(navigation.navigate).toHaveBeenCalledWith('ProgramResult', { programId: 'p' });
});
it('keeps an ordinary daily mark on the active program screen', async () => {
  mockPrograms = [{ ...program, days: 14 }];
  const view = await render(<MyFitnessScreen navigation={navigation} route={route} />);
  await fireEvent.press(view.getByRole('button', { name: 'Сделал: Отжимания' }));
  expect(mockLog).toHaveBeenCalledWith('p', 50);
  expect(navigation.navigate).not.toHaveBeenCalled();
});
it('turns the open detail into a closeable result after the final mark', async () => {
  const view = await render(<MyFitnessScreen navigation={navigation} route={route} />);
  await fireEvent.press(view.getByRole('button', { name: 'Отжимания' }));
  mockPrograms = [{ ...program, log: { '2026-09-07': 75 } }];
  await view.rerender(<MyFitnessScreen navigation={navigation} route={route} />);
  expect(view.getByText('Всего за программу')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Поделиться результатом' })).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Закрыть' }));
  expect(view.queryByText('Всего за программу')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'История программ: 1' }));
  expect(navigation.navigate).toHaveBeenCalledWith('ProgramHistory');
});
