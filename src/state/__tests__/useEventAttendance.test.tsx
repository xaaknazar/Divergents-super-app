import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useEventAttendance } from '../useEventAttendance';
import { fetchAttendanceRoster, saveAttendanceRecord } from '../../data/eventAttendance';
let mockUser = 'organizer';
const mockToken = jest.fn(async () => 'token');
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockUser, getToken: mockToken }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback: () => () => void) => require('react').useEffect(callback, [callback]) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
jest.mock('../../data/eventAttendance', () => ({ fetchAttendanceRoster: jest.fn(), saveAttendanceRecord: jest.fn() }));
const target = { kind: 'meetup' as const, eventId: 'event' };
const roster = { ...target, title: 'Встреча', participants: [{ applicationId: 'app', userId: 'participant', name: 'Имя', record: null }] };
const record = { id: 'r', applicationId: 'app', userId: 'participant', status: 'arrived' as const, comment: '', version: 1, updatedAt: '2026-11-11T12:00:00Z' };
const load = jest.mocked(fetchAttendanceRoster), save = jest.mocked(saveAttendanceRecord);
beforeEach(() => { jest.clearAllMocks(); mockUser = 'organizer'; mockToken.mockReset(); mockToken.mockResolvedValue('token');
  load.mockReset(); load.mockResolvedValue(roster); save.mockReset(); save.mockResolvedValue(record); });
async function mount() { const h = await renderHook(() => useEventAttendance(target)); await waitFor(() => expect(h.result.current.loading).toBe(false)); return h; }
test('lost receipt keeps original command for an exact retry and never claims saved', async () => {
  const h = await mount(); save.mockRejectedValueOnce(new Error('Нет связи'));
  await act(async () => { await expect(h.result.current.save('app', 'arrived', '')).rejects.toThrow('Нет связи'); });
  expect(h.result.current.participants[0].record).toBeNull();
  const first = save.mock.calls[0][2];
  await act(async () => { await h.result.current.save('app', 'arrived', ''); });
  expect(save.mock.calls[1][2]).toEqual(first); expect(h.result.current.participants[0].record).toEqual(record);
});
test('double press has only one request; a refreshed newer record wins', async () => {
  const h = await mount(); let resolve!: (v: typeof record) => void;
  save.mockImplementationOnce(() => new Promise(r => { resolve = r; })); let pending!: Promise<void>;
  await act(async () => { pending = h.result.current.save('app', 'arrived', ''); });
  await act(async () => { await expect(h.result.current.save('app', 'late', '')).rejects.toThrow('сохраняется'); });
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(record); await pending; });
  load.mockResolvedValueOnce({ ...roster, participants: [{ ...roster.participants[0], record: { ...record, version: 2, status: 'late' } }] });
  await act(async () => { await h.result.current.refresh(); });
  expect(h.result.current.participants[0].record?.status).toBe('late');
});
test('account change during token loading cannot send the old organizer command', async () => {
  const h = await mount(); let resolve!: (v: string) => void;
  mockToken.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  let pending!: Promise<void>;
  await act(async () => { pending = h.result.current.save('app', 'arrived', ''); });
  mockUser = 'other'; await h.rerender({});
  await act(async () => { resolve('old-token'); await expect(pending).rejects.toThrow('Аккаунт'); });
  expect(save).not.toHaveBeenCalled(); expect(h.result.current.participants[0].record).toBeNull();
});
test('stalled sign-in finishes with an actionable error rather than an endless spinner', async () => {
  jest.useFakeTimers();
  try {
    mockToken.mockImplementation(() => new Promise(() => {}));
    const h = await renderHook(() => useEventAttendance(target));
    await act(async () => { await jest.advanceTimersByTimeAsync(12001); });
    expect(h.result.current.loading).toBe(false); expect(h.result.current.error).toContain('Проверьте связь');
    expect(load).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
test('an old response cannot reappear after switching away and back to the account', async () => {
  const h = await mount(); let resolve!: (v: typeof record) => void;
  save.mockImplementationOnce(() => new Promise(r => { resolve = r; })); let pending!: Promise<void>;
  await act(async () => { pending = h.result.current.save('app', 'arrived', ''); });
  mockUser = 'other'; await h.rerender({}); mockUser = 'organizer'; await h.rerender({});
  await act(async () => { resolve(record); await expect(pending).rejects.toThrow('Аккаунт'); });
  expect(h.result.current.participants[0].record).toBeNull();
});
