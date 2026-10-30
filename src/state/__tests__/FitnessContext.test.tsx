import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { FitnessProvider, useFitness } from '../FitnessContext';
import { programHistory } from '../../data/programResults';
import { cancelProgramReminder } from '../programReminders';
import { FitnessProgram } from '../../data/fitness';

let mockDay = '2026-09-07';
let mockStored: any;
const mockWorkouts: any[] = [];
jest.mock('../ActivityContext', () => ({ useActivities: () => ({ workouts: mockWorkouts }) }));
jest.mock('../useLocalDay', () => ({ useLocalDay: () => mockDay }));
jest.mock('../programReminders', () => ({ scheduleProgramReminder: jest.fn(async () => null), cancelProgramReminder: jest.fn(async () => {}) }));
jest.mock('../persist', () => ({ loadJSON: jest.fn(async () => mockStored), saveJSON: jest.fn(async (_key, value) => { mockStored = JSON.parse(JSON.stringify(value)); }) }));
const program: FitnessProgram = { id: 'p', title: 'Отжимания', unit: 'раз', target: 50, days: 7, startKey: '2026-09-01', createdISO: '', remindAt: null, notificationId: 'reminder', log: { '2026-09-01': 50 } };
const wrapper = ({ children }: { children: React.ReactNode }) => <FitnessProvider>{children}</FitnessProvider>;
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-07T12:00:00'));
  mockDay = '2026-09-07'; mockStored = { programs: [program], goals: [], metrics: [] }; jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

it('keeps the final log across remount and cancels its reminder without deleting history', async () => {
  const first = await renderHook(useFitness, { wrapper });
  await waitFor(() => expect(first.result.current.loaded).toBe(true));
  await act(async () => { first.result.current.logProgram('p', 75); });
  expect(programHistory(first.result.current.programs)[0].s.total).toBe(125);
  expect(cancelProgramReminder).toHaveBeenCalledWith('reminder');
  await first.unmount();
  const second = await renderHook(useFitness, { wrapper });
  await waitFor(() => expect(second.result.current.loaded).toBe(true));
  expect(programHistory(second.result.current.programs)[0].s.total).toBe(125);
});
it('rejects invalid, future and outside-period marks; finished history is read-only', async () => {
  const { result } = await renderHook(useFitness, { wrapper });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(async () => {
    result.current.logProgram('p', NaN);
    result.current.logProgram('p', -1);
    result.current.logProgram('p', 500, '2026-09-08');
    result.current.logProgram('p', 500, '2026-08-31');
  });
  expect(result.current.programs[0].log).toEqual(program.log);
  await act(async () => { result.current.logProgram('p', 50); });
  await act(async () => { result.current.logProgram('p', 999); });
  expect(result.current.programs[0].log['2026-09-07']).toBe(50);
});
it('rolls an incomplete program into history at midnight even with no new mark', async () => {
  const { result, rerender } = await renderHook(useFitness, { wrapper });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(programHistory(result.current.programs)).toHaveLength(0);
  jest.setSystemTime(new Date('2026-09-08T00:01:00')); mockDay = '2026-09-08';
  await rerender({});
  expect(programHistory(result.current.programs)[0].s.total).toBe(50);
  expect(cancelProgramReminder).toHaveBeenCalledWith('reminder');
});
