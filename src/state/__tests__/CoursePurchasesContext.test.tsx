import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { CoursePurchasesProvider, useCoursePurchases } from '../CoursePurchasesContext';
import { courseStore, loadPurchaseCatalog, purchaseRequest, courseAccessChanged } from '../coursePurchases';
const token = 'e16829d1-3b08-4391-bc6a-ac6ce144b91b';
const productId = 'kz.divergents.course.one';
const transaction = { transactionId: '12345', productId, appAccountToken: token, environment: 'Production' };
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: 'user-one', getToken: async () => 'session' }) }));
jest.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => null }));
jest.mock('../coursePurchases', () => ({ ...jest.requireActual('../coursePurchases'),
  courseStore: { products: jest.fn(), purchase: jest.fn(), pending: jest.fn(), finish: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) },
  loadPurchaseCatalog: jest.fn(), purchaseRequest: jest.fn(), courseAccessChanged: jest.fn(),
  // Supply the mocked HTTP boundary to the real commit-before-finish routine.
  deliverCourseTransactions: (options: object) => jest.requireActual('../coursePurchases').deliverCourseTransactions({
    ...options, confirm: require('../coursePurchases').purchaseRequest,
  }),
}));
const native = jest.mocked(courseStore!);
const catalog = jest.mocked(loadPurchaseCatalog);
const request = jest.mocked(purchaseRequest);
const wrapper = ({ children }: { children: React.ReactNode }) => <CoursePurchasesProvider>{children}</CoursePurchasesProvider>;
beforeEach(() => {
  jest.clearAllMocks();
  catalog.mockResolvedValue({ enabled: true, accountToken: token, products: [{ courseId: 'one', productId }] });
  native.products.mockResolvedValue([{ id: productId, title: 'Курс', displayPrice: '4 000 ₸' }]);
  native.pending.mockResolvedValue([]); native.finish.mockResolvedValue();
  request.mockImplementation(async (_token, body: any) => body.action === 'prepare'
    ? { status: 'ready', courseId: 'one', productId, accountToken: token }
    : { status: 'confirmed', courseId: 'one', owned: true });
});
test('recovers paid transactions even when App Store price loading fails', async () => {
  native.pending.mockResolvedValue([transaction as any]); native.products.mockRejectedValue(new Error('store unavailable'));
  const { result } = await renderHook(useCoursePurchases, { wrapper });
  await waitFor(() => expect(native.finish).toHaveBeenCalledWith('12345', token));
  expect(result.current.phase).toBe('success'); expect(courseAccessChanged).toHaveBeenCalled();
});
test('cancellation leaves the course locked without a confirmation request', async () => {
  const { result } = await renderHook(useCoursePurchases, { wrapper });
  await waitFor(() => expect(result.current.products).toHaveLength(1));
  native.purchase.mockResolvedValue({ status: 'cancelled' });
  await act(async () => { expect(await result.current.buy('one')).toBe(false); });
  expect(result.current.phase).toBe('idle'); expect(request).toHaveBeenCalledTimes(1);
  expect(native.finish).not.toHaveBeenCalled();
});
test('Ask to Buy waits without reporting access or finishing a transaction', async () => {
  const { result } = await renderHook(useCoursePurchases, { wrapper });
  await waitFor(() => expect(result.current.products).toHaveLength(1));
  native.purchase.mockResolvedValue({ status: 'pending' });
  await act(async () => { expect(await result.current.buy('one')).toBe(false); });
  expect(result.current.phase).toBe('pending'); expect(native.finish).not.toHaveBeenCalled();
  expect(courseAccessChanged).not.toHaveBeenCalled();
});
test('explicit restore asks StoreKit to sync and confirms the restored transaction', async () => {
  const { result } = await renderHook(useCoursePurchases, { wrapper });
  await waitFor(() => expect(result.current.products).toHaveLength(1));
  native.pending.mockResolvedValue([transaction as any]);
  await act(async () => { await result.current.restore(); });
  expect(native.pending).toHaveBeenLastCalledWith(token, true);
  expect(native.finish).toHaveBeenCalledWith('12345', token);
  expect(result.current.phase).toBe('success');
});
