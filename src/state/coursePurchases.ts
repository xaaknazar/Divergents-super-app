import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { z } from 'zod';
import { API_BASE } from '../config';
import { netFetch } from '../data/net';

const TransactionSchema = z.object({ transactionId: z.string().regex(/^\d+$/), productId: z.string(),
  appAccountToken: z.string().uuid(), environment: z.enum(['Production', 'Sandbox']) });
export type CourseTransaction = z.infer<typeof TransactionSchema>;
export type StoreProduct = { id: string; title: string; displayPrice: string };
export type PurchaseCatalog = { enabled: boolean; testMode?: boolean; accountToken: string | null; products: { courseId: string; productId: string }[] };
export type Store = {
  products(ids: string[]): Promise<StoreProduct[]>;
  purchase(id: string, token: string): Promise<{ status: 'purchased'; transaction: CourseTransaction } | { status: 'pending' | 'cancelled' }>;
  pending(token: string, restore: boolean): Promise<CourseTransaction[]>;
  finish(id: string, token: string): Promise<void>;
  addListener(event: string, callback: () => void): { remove(): void };
};
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<Store>('CoursePurchases') : null;
export const courseStore = native;
export class PurchaseRequestError extends Error {
  constructor(public code: string) { super(code); }
}
export async function purchaseRequest(token: string, body?: object) {
  const result = await netFetch(API_BASE + '/api/mobile/purchases/apple', {
    method: body ? 'POST' : 'GET', timeoutMs: 15_000, retries: 0,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!result.ok) {
    const data = await result.json().catch(() => null);
    throw new PurchaseRequestError(data?.error ?? (result.status === 404 ? 'not_configured' : 'network'));
  }
  return result.json();
}
export async function loadPurchaseCatalog(token: string): Promise<PurchaseCatalog> {
  return z.object({ enabled: z.boolean(), testMode: z.boolean().optional(), accountToken: z.string().uuid().nullable(),
    products: z.array(z.object({ courseId: z.string(), productId: z.string() })).max(100) }).parse(await purchaseRequest(token));
}

/** Commit on server first, finish in StoreKit second. Network errors leave the
 * transaction in Apple's durable queue, surviving reinstalls and process death. */
export async function deliverCourseTransactions(options: {
  store: Store; token: string; accountToken: string; transactions: CourseTransaction[];
  isCurrent: () => boolean; confirm?: typeof purchaseRequest;
}): Promise<{ delivered: string[]; pending: number; settled: number }> {
  const delivered: string[] = [];
  let pending = 0, settled = 0;
  const confirm = options.confirm ?? purchaseRequest;
  for (const raw of options.transactions) {
    if (!options.isCurrent()) break;
    try {
      const tx = TransactionSchema.parse(raw);
      if (tx.appAccountToken.toLowerCase() !== options.accountToken.toLowerCase()) continue;
      const ack = z.object({ status: z.literal('confirmed'), courseId: z.string(), owned: z.boolean() }).parse(
        await confirm(options.token, { action: 'confirm', transactionId: tx.transactionId, environment: tx.environment }));
      if (!options.isCurrent()) break;
      await options.store.finish(tx.transactionId, options.accountToken);
      settled++;
      if (ack.owned) delivered.push(ack.courseId);
    } catch { pending++; }
  }
  return { delivered, pending, settled };
}

const accessListeners = new Set<() => void>();
export function courseAccessChanged() { accessListeners.forEach(listener => listener()); }
export function onCourseAccessChanged(listener: () => void) { accessListeners.add(listener); return () => { accessListeners.delete(listener); }; }
