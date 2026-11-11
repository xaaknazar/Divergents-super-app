import { fetchAttendanceRoster, saveAttendanceRecord } from '../eventAttendance';
jest.mock('../../config', () => ({ API_BASE: 'https://example.test' }));
const target = { kind: 'sport' as const, eventId: 'event' };
const command = { applicationId: 'app', operationId: 'operation', expectedVersion: 0, status: 'late' as const, comment: '' };
const record = { id: 'r', applicationId: 'app', userId: 'user', status: 'late', comment: '', version: 1, updatedAt: '2026-11-11T12:00:00Z' };
const receipt = { ok: true, ...target, ...command, record };
const roster = { ...target, title: 'Волейбол', participants: [{ applicationId: 'app', userId: 'user', name: 'Имя', record }] };
const fetchMock = jest.fn();
const response = (json: unknown) => ({ ok: true, json: async () => json });
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
test('a successful HTTP response is insufficient without an exact attendance receipt', async () => {
  for (const invalid of [{ ok: true }, { ...receipt, eventId: 'other' }, { ...receipt, operationId: 'other' },
    { ...receipt, record: { ...record, version: 2 } }, { ...receipt, record: { ...record, status: 'arrived' } }]) {
    fetchMock.mockResolvedValueOnce(response(invalid));
    await expect(saveAttendanceRecord(target, 'token', command)).rejects.toThrow();
  }
  fetchMock.mockResolvedValueOnce(response(receipt));
  expect(await saveAttendanceRecord(target, 'token', command)).toEqual(record);
});
test('roster rejects wrong event, duplicate participants and mismatched records', async () => {
  for (const invalid of [{ ...roster, kind: 'meetup' }, { ...roster, participants: [...roster.participants, ...roster.participants] },
    { ...roster, participants: [{ ...roster.participants[0], record: { ...record, userId: 'other' } }] }]) {
    fetchMock.mockResolvedValueOnce(response(invalid));
    await expect(fetchAttendanceRoster(target, 'token')).rejects.toThrow('список');
  }
  fetchMock.mockResolvedValueOnce(response(roster));
  expect((await fetchAttendanceRoster(target, 'token')).participants).toHaveLength(1);
});
test('missing auth never sends; network errors are explained in Russian', async () => {
  await expect(saveAttendanceRecord(target, null, command)).rejects.toThrow('Войдите');
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(fetchAttendanceRoster(target, 'token')).rejects.toThrow('Проверьте связь');
});
