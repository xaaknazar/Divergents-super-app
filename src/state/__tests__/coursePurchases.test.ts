import { deliverCourseTransactions, type Store, type CourseTransaction } from '../coursePurchases';
jest.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => null }));
const accountToken = 'e16829d1-3b08-4391-bc6a-ac6ce144b91b';
const tx: CourseTransaction = { transactionId: '12345', productId: 'kz.divergents.course.one', appAccountToken: accountToken, environment: 'Production' };
const ack = { status: 'confirmed', courseId: 'course-one', owned: true };
function fixture() {
  const store = { finish: jest.fn(async () => {}) } as unknown as Store;
  const confirm = jest.fn(async () => ack);
  const options = { store, token: 'clerk-fixture', accountToken, transactions: [tx], isCurrent: () => true, confirm };
  return { store, confirm, options };
}
test('finishes Apple transaction only after authenticated server confirmation', async () => {
  const { options, store, confirm } = fixture();
  const result = await deliverCourseTransactions(options);
  expect(confirm).toHaveBeenCalledWith('clerk-fixture', { action: 'confirm', transactionId: '12345', environment: 'Production' });
  expect(jest.mocked(confirm).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(store.finish).mock.invocationCallOrder[0]);
  expect(store.finish).toHaveBeenCalledWith('12345', accountToken);
  expect(result).toEqual({ delivered: ['course-one'], pending: 0, settled: 1 });
});
test('network failure leaves durable StoreKit transaction unfinished', async () => {
  const { options, store, confirm } = fixture(); confirm.mockRejectedValueOnce(new Error('offline'));
  expect(await deliverCourseTransactions(options)).toEqual({ delivered: [], pending: 1, settled: 0 });
  expect(store.finish).not.toHaveBeenCalled();
  expect(await deliverCourseTransactions(options)).toEqual({ delivered: ['course-one'], pending: 0, settled: 1 });
});
test('malformed or merely pending acknowledgement cannot finish or unlock', async () => {
  const { options, store, confirm } = fixture(); confirm.mockResolvedValueOnce({ status: 'pending' } as any);
  expect((await deliverCourseTransactions(options)).pending).toBe(1);
  expect(store.finish).not.toHaveBeenCalled();
});
test('another account cannot confirm or finish a transaction', async () => {
  const { options, store, confirm } = fixture(); options.accountToken = 'b6af9277-f732-4230-a23b-dd97c0fdcc5a';
  expect(await deliverCourseTransactions(options)).toEqual({ delivered: [], pending: 0, settled: 0 });
  expect(confirm).not.toHaveBeenCalled(); expect(store.finish).not.toHaveBeenCalled();
});
test('account switch while server is responding cannot finish or publish stale access', async () => {
  const { options, store, confirm } = fixture(); let current = true;
  options.isCurrent = () => current;
  confirm.mockImplementationOnce(async () => { current = false; return ack; });
  expect(await deliverCourseTransactions(options)).toEqual({ delivered: [], pending: 0, settled: 0 });
  expect(store.finish).not.toHaveBeenCalled();
});
test('Apple acknowledgement failure can retry a server-confirmed purchase safely', async () => {
  const { options, store } = fixture(); jest.mocked(store.finish).mockRejectedValueOnce(new Error('backgrounded'));
  expect((await deliverCourseTransactions(options)).pending).toBe(1);
  expect((await deliverCourseTransactions(options)).delivered).toEqual(['course-one']);
});
test('a verified refunded/admin-revoked purchase is acknowledged without claiming access', async () => {
  const { options, store, confirm } = fixture(); confirm.mockResolvedValueOnce({ ...ack, owned: false });
  expect(await deliverCourseTransactions(options)).toEqual({ delivered: [], pending: 0, settled: 1 });
  expect(store.finish).toHaveBeenCalled();
});
