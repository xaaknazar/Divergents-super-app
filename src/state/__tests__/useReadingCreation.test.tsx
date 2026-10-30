import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useReadingCreation } from '../useReadingCreation';
import { ReadingApiError, sendReadingCommand } from '../../data/reading';
import { readJSON, saveJSON } from '../persist';
let mockAccount = 'admin';
let mockDisk: Record<string, unknown> = {};
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockAccount, getToken: async () => 'token' }) }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../data/reading', () => ({ ...jest.requireActual('../../data/reading'), sendReadingCommand: jest.fn() }));
jest.mock('../persist', () => ({ readJSON: jest.fn(async (key, fallback) => ({ ok: true, value: mockDisk[key] ?? fallback })),
  saveJSON: jest.fn(async (key, value) => { mockDisk[key] = JSON.parse(JSON.stringify(value)); }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
const draft = { title: 'Одна книга ближе', startDate: '2099-01-01', durationDays: 21, teams: [{ name: 'Клуб', captainNickname: 'Reader', capacity: 20 }] };
const publication = { operationId: '22222222-2222-4222-8222-222222222222', draft };
const send = jest.mocked(sendReadingCommand), write = jest.mocked(saveJSON), read = jest.mocked(readJSON);
beforeEach(() => { jest.clearAllMocks(); mockAccount = 'admin'; mockDisk = {};
  send.mockReset().mockResolvedValue({ ok: true, challengeId: 'created' });
  write.mockReset().mockImplementation(async (key, value) => { mockDisk[key] = JSON.parse(JSON.stringify(value)); });
  read.mockReset().mockImplementation(async (key, fallback) => ({ ok: true, value: (mockDisk[key] ?? fallback) as any }));
});
test('creation is persisted before network and becomes success only with server ID', async () => {
  const h = await renderHook(() => useReadingCreation());
  await waitFor(() => expect(h.result.current.state.phase).toBe('editing'));
  await act(async () => { await h.result.current.submit(draft); });
  expect(write.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0]);
  expect(h.result.current.state.phase).toBe('success'); expect(h.result.current.state.challengeId).toBe('created');
  expect(mockDisk['dvg.readingCreate.admin']).toBeNull();
});
test('timeout survives restart, shows exact saved fields and retries the same operation', async () => {
  send.mockRejectedValueOnce(new Error('timeout'));
  const h = await renderHook(() => useReadingCreation());
  await waitFor(() => expect(h.result.current.state.phase).toBe('editing'));
  await act(async () => { await h.result.current.submit(draft); });
  const sent = send.mock.calls[0][1];
  expect(h.result.current.state.phase).toBe('pending'); await h.unmount();
  const restored = await renderHook(() => useReadingCreation());
  await waitFor(() => expect(restored.result.current.state.publication?.draft).toEqual(draft));
  expect(send).toHaveBeenCalledTimes(1); // Loading a pending operation is not publication consent.
  await act(async () => { await restored.result.current.submit(); });
  expect(send.mock.calls[1][1]).toEqual(sent);
  expect(restored.result.current.state.phase).toBe('success');
});
test('never silently substitutes a previously saved draft for newly entered fields', async () => {
  const h = await renderHook(() => useReadingCreation());
  await waitFor(() => expect(h.result.current.state.phase).toBe('editing'));
  mockDisk['dvg.readingCreate.admin'] = publication;
  await act(async () => { await h.result.current.submit({ ...draft, title: 'Другое название' }); });
  expect(send).not.toHaveBeenCalled();
  expect(h.result.current.state.publication).toEqual(publication);
});
test('definitive validation rejection unlocks the original draft for correction', async () => {
  mockDisk['dvg.readingCreate.admin'] = publication;
  send.mockRejectedValueOnce(new ReadingApiError('Капитан не найден', 400));
  const h = await renderHook(() => useReadingCreation());
  await waitFor(() => expect(h.result.current.state.phase).toBe('pending'));
  await act(async () => { await h.result.current.submit(); });
  expect(h.result.current.state).toMatchObject({ phase: 'editing', draft, error: 'Капитан не найден' });
  expect(mockDisk['dvg.readingCreate.admin']).toBeNull();
});
test('missing ID or unknown conflict never reports success or erases the saved request', async () => {
  mockDisk['dvg.readingCreate.admin'] = publication; send.mockResolvedValueOnce({ ok: true });
  const h = await renderHook(() => useReadingCreation());
  await waitFor(() => expect(h.result.current.state.phase).toBe('pending'));
  await act(async () => { await h.result.current.submit(); });
  expect(h.result.current.state.phase).toBe('pending');
  send.mockRejectedValueOnce(new ReadingApiError('Конфликт запроса', 409));
  await act(async () => { await h.result.current.submit(); });
  expect(mockDisk['dvg.readingCreate.admin']).toEqual(publication);
});
test('failed local save blocks network and does not claim the request was saved', async () => {
  write.mockRejectedValueOnce(new Error('disk'));
  const h = await renderHook(() => useReadingCreation());
  await waitFor(() => expect(h.result.current.state.phase).toBe('editing'));
  await act(async () => { await h.result.current.submit(draft); });
  expect(send).not.toHaveBeenCalled(); expect(h.result.current.state.phase).toBe('blocked');
  await act(async () => { await h.result.current.reload(); });
  expect(h.result.current.state.draft).toEqual(draft);
});
test('double press sends once and a late response cannot leak to another account', async () => {
  let resolve!: (value: any) => void;
  send.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const h = await renderHook(() => useReadingCreation());
  await waitFor(() => expect(h.result.current.state.phase).toBe('editing'));
  let promise!: Promise<void>;
  await act(async () => { promise = h.result.current.submit(draft); });
  await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  await act(async () => { await h.result.current.submit(draft); });
  expect(send).toHaveBeenCalledTimes(1);
  mockAccount = 'other'; await h.rerender({});
  await waitFor(() => expect(h.result.current.state.phase).toBe('editing'));
  await act(async () => { resolve({ ok: true, challengeId: 'private' }); await promise; });
  expect(h.result.current.state.challengeId).toBeUndefined(); expect(h.result.current.state.publication).toBeUndefined();
});
