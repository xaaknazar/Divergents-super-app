import { progressSyncPresentation } from '../progressSyncPresentation';
const complete = { completed: 3, total: 3, pending: false, error: null, dayLocked: false };

test('Готово means complete AND confirmed', () => {
  expect(progressSyncPresentation(complete)).toMatchObject({ label: 'Готово', tone: 'success' });
  expect(progressSyncPresentation({ ...complete, pending: true })).toMatchObject({ label: 'Сохраняем…', tone: 'warning' });
});
test.each(['network', 'storage', 'protocol_mismatch', 'version_conflict', 'invalid_receipt', 'day_changed'])('never shows success with %s', error => {
  expect(progressSyncPresentation({ ...complete, error })).toMatchObject({ label: 'Не подтверждено', confirmed: false });
});
test('closed day does not hide unconfirmed reports', () => {
  expect(progressSyncPresentation({ ...complete, dayLocked: true, pending: true }).message).toContain('ещё не подтверждены');
});
