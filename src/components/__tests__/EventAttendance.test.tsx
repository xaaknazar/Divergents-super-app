import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { EventAttendanceRow } from '../EventAttendanceRow';
import { EventAttendanceRoster } from '../EventAttendanceRoster';
import { EventManagementPanel } from '../EventManagementPanel';
jest.mock('../HalfSheet', () => ({ HalfSheet: ({ children, footer }: any) => <>{children}{footer}</> }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../MemberAvatar', () => ({ MemberAvatar: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../theme/tokens'), textScale: 1 }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'operation-id' }));
const mockRefresh = jest.fn(async () => {});
let mockData: any;
jest.mock('../../state/useEventResource', () => ({ useEventResource: () => ({ signedIn: true, data: mockData, refresh: mockRefresh, getToken: async () => 'token' }) }));
jest.mock('../../data/eventManagement', () => ({ fetchEventManagement: jest.fn(), changeEvent: jest.fn() }));
const participant = { applicationId: 'app', userId: 'user', name: 'Айдана', record: null };
const record = { id: 'r', applicationId: 'app', userId: 'user', status: 'arrived' as const, comment: '', version: 1, updatedAt: '2026-11-11T12:00:00Z' };
beforeEach(() => { jest.clearAllMocks(); mockData = null; });
test('three one-tap choices, no implicit absence, optional comment', async () => {
 const save = jest.fn(async () => {});
 const ui = await render(<EventAttendanceRow participant={participant} onSave={save} onRefresh={() => {}} />);
 expect(ui.getByText('Ещё не отмечен')).toBeTruthy(); expect(ui.getAllByRole('radio')).toHaveLength(3);
 await fireEvent.press(ui.getByRole('radio', { name: 'Айдана: Пришёл' }));
 expect(save).toHaveBeenCalledWith('app', 'arrived', '');
 await ui.rerender(<EventAttendanceRow participant={{ ...participant, record }} onSave={save} onRefresh={() => {}} />);
 await fireEvent.press(ui.getByRole('button', { name: 'Добавить комментарий: Айдана' }));
 await fireEvent.press(ui.getByRole('button', { name: 'Сохранить комментарий' }));
 expect(save).toHaveBeenLastCalledWith('app', 'arrived', '');
});
test('pending save prevents duplicate taps; failure never claims saved', async () => {
 let reject!: (e: Error) => void; const save = jest.fn(() => new Promise<void>((_, r) => { reject = r; }));
 const ui = await render(<EventAttendanceRow participant={participant} onSave={save} onRefresh={() => {}} />);
 await fireEvent.press(ui.getByRole('radio', { name: 'Айдана: Опоздал' }));
 await fireEvent.press(ui.getByRole('radio', { name: 'Айдана: Не пришёл' }));
 expect(save).toHaveBeenCalledTimes(1);
 await act(async () => { reject(new Error('Нет связи')); });
 expect(ui.queryByText('Отметка сохранена')).toBeNull(); expect(ui.getByText('Нет связи')).toBeTruthy();
});
test('comment correction retains draft on failure', async () => {
 const save = jest.fn(async () => { throw new Error('Нет связи'); });
 const ui = await render(<EventAttendanceRow participant={{ ...participant, record }} onSave={save} onRefresh={() => {}} />);
 await fireEvent.press(ui.getByRole('button', { name: 'Добавить комментарий: Айдана' }));
 await fireEvent.changeText(ui.getByLabelText('Комментарий — по желанию'), 'Пришёл позже');
 await fireEvent.press(ui.getByRole('button', { name: 'Сохранить комментарий' }));
 await waitFor(() => expect(ui.getByText('Нет связи')).toBeTruthy());
 expect(ui.getByLabelText('Комментарий — по желанию').props.value).toBe('Пришёл позже');
});
test('empty list does not invent participants', async () => {
 const ui = await render(<EventAttendanceRoster participants={[]} onSave={async () => {}} onRefresh={() => {}} />);
 expect(ui.getByText('Нет принятых участников')).toBeTruthy(); expect(ui.queryAllByRole('radio')).toHaveLength(0);
});
test('organizer action is visible after start while event is still running', async () => {
 const attend = jest.fn(); mockData = { canManage: true, canTakeAttendance: true, finished: false, canComplete: true, announcements: [] };
 const ui = await render(<EventManagementPanel kind="sport" eventId="e" onAttendance={attend} />);
 await fireEvent.press(ui.getByRole('button', { name: 'Отметить участников' })); expect(attend).toHaveBeenCalledTimes(1);
 mockData = { ...mockData, canManage: false }; await ui.rerender(<EventManagementPanel kind="sport" eventId="e" onAttendance={attend} />);
 expect(ui.queryByRole('button', { name: 'Отметить участников' })).toBeNull();
});
test('an already-open meeting refreshes at server start time', async () => {
 jest.useFakeTimers();
 try {
  mockData = { canManage: true, canTakeAttendance: false, startsAt: '2026-11-11T12:00:01Z', serverNow: '2026-11-11T12:00:00Z', finished: false, canComplete: false, announcements: [] };
  const ui = await render(<EventManagementPanel kind="meetup" eventId="e" onAttendance={() => {}} />);
  expect(ui.queryByRole('button', { name: 'Отметить участников' })).toBeNull();
  await act(async () => { jest.advanceTimersByTime(1500); }); expect(mockRefresh).toHaveBeenCalledTimes(1);
  mockData = { ...mockData, canTakeAttendance: true };
  await ui.rerender(<EventManagementPanel kind="meetup" eventId="e" onAttendance={() => {}} />);
  expect(ui.getByRole('button', { name: 'Отметить участников' })).toBeTruthy();
 } finally { jest.useRealTimers(); }
});
