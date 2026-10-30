import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { z } from 'zod';
import { courseStore, courseAccessChanged, deliverCourseTransactions, loadPurchaseCatalog,
  purchaseRequest, type PurchaseCatalog, type StoreProduct } from './coursePurchases';

export type PurchasePhase = 'idle' | 'loading' | 'purchasing' | 'confirming' | 'pending' | 'restoring' | 'success' | 'error';
const empty: PurchaseCatalog = { enabled: false, accountToken: null, products: [] };
type State = { catalog: PurchaseCatalog; products: StoreProduct[]; phase: PurchasePhase; message: string | null;
  available: boolean; buy(courseId: string): Promise<boolean>; restore(): Promise<void>; retry(): Promise<void> };
const noop = async () => {};
const Context = createContext<State>({ catalog: empty, products: [], phase: 'idle', message: null,
  available: false, buy: async () => false, restore: noop, retry: noop });
const waiting = 'Покупка ожидает подтверждения. Повторно платить не нужно — доступ появится после проверки.';
async function boundedToken(getToken: () => Promise<string | null>) {
  let timer: ReturnType<typeof setTimeout>;
  try { return await Promise.race([getToken(), new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('auth_timeout')), 12_000);
  })]); } finally { clearTimeout(timer!); }
}

export function CoursePurchasesProvider({ children }: { children: React.ReactNode }) {
  const { userId, getToken } = useAuth();
  const latest = useRef({ userId, getToken }); latest.current = { userId, getToken };
  const alive = useRef(true);
  const busy = useRef(false);
  const catalogRef = useRef(empty);
  const productsKey = useRef('');
  const [catalog, setCatalog] = useState(empty);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [phase, setPhase] = useState<PurchasePhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const current = useCallback((id: string | null | undefined) => alive.current && !!id && latest.current.userId === id, []);

  const sync = useCallback(async (restore = false) => {
    if (!courseStore || busy.current || !latest.current.userId) return;
    busy.current = true;
    const id = latest.current.userId;
    try {
      if (restore) { setPhase('restoring'); setMessage(null); }
      const token = await boundedToken(latest.current.getToken);
      if (!token || !current(id)) return;
      const next = await loadPurchaseCatalog(token);
      if (!current(id)) return;
      catalogRef.current = next; setCatalog(next);
      if (!next.enabled) { setProducts([]); productsKey.current = ''; }
      if (!next.accountToken) { if (restore) setPhase('idle'); return; }
      const pending = await courseStore.pending(next.accountToken, restore);
      if (!current(id)) return;
      const result = await deliverCourseTransactions({ store: courseStore, token,
        accountToken: next.accountToken, transactions: pending, isCurrent: () => current(id) });
      if (!current(id)) return;
      if (result.settled || restore) courseAccessChanged();
      if (result.pending) { setPhase('pending'); setMessage(waiting); }
      else if (result.delivered.length) { setPhase('success'); setMessage('Покупка подтверждена. Курс открыт.'); }
      else if (result.settled) { setPhase('idle'); setMessage('Покупка проверена. Доступ к курсу сейчас неактивен.'); }
      else if (restore) { setPhase('idle'); setMessage('Покупки проверены. Если курс приобретён под другим аккаунтом Divergents, войдите в него.'); }
      // Recover paid transactions before loading store prices. A catalog outage
      // must never block delivery of a purchase Apple has already accepted.
      const key = next.products.map(p => p.productId).sort().join(',');
      if (next.enabled && (productsKey.current !== key || restore)) {
        try {
          const loaded = z.array(z.object({ id: z.string(), title: z.string(), displayPrice: z.string().min(1) })).parse(
            await courseStore.products(next.products.map(p => p.productId)));
          if (!current(id)) return;
          setProducts(loaded);
          productsKey.current = loaded.length === next.products.length ? key : '';
        } catch { /* Existing payments were delivered; retry prices next time. */ }
      }
    } catch {
      if (current(id) && restore) { setPhase('error'); setMessage('Не удалось проверить покупки. Попробуйте ещё раз — повторно оплачивать курс не нужно.'); }
    } finally { busy.current = false; }
  }, [current]);

  useEffect(() => {
    alive.current = true;
    void sync();
    const app = AppState.addEventListener('change', state => { if (state === 'active') void sync(); });
    const listener = courseStore?.addListener('transactionAvailable', () => { void sync(); });
    const interval = courseStore ? setInterval(() => { if (AppState.currentState === 'active') void sync(); }, 30_000) : null;
    return () => { alive.current = false; app.remove(); listener?.remove(); if (interval) clearInterval(interval); };
  }, [sync, userId]);

  const buy = useCallback(async (courseId: string) => {
    const id = latest.current.userId;
    if (!courseStore || !id || busy.current || !catalogRef.current.enabled) return false;
    busy.current = true;
    setPhase('purchasing'); setMessage(null);
    let charged = false;
    try {
      const token = await boundedToken(latest.current.getToken);
      if (!token || !current(id)) return false;
      const intent = z.discriminatedUnion('status', [
        z.object({ status: z.literal('owned'), courseId: z.string() }),
        z.object({ status: z.literal('ready'), courseId: z.string(), productId: z.string(), accountToken: z.string().uuid() }),
      ]).parse(await purchaseRequest(token, { action: 'prepare', courseId }));
      if (!current(id)) return false;
      if (intent.status === 'owned') { setPhase('success'); courseAccessChanged(); return true; }
      const result = await courseStore.purchase(intent.productId, intent.accountToken);
      if (!current(id)) return false;
      if (result.status === 'cancelled') { setPhase('idle'); return false; }
      if (result.status === 'pending') { setPhase('pending'); setMessage('Ожидаем одобрения покупки в App Store. Повторно платить не нужно.'); return false; }
      if (result.status !== 'purchased') throw new Error('invalid_store_result');
      charged = true; setPhase('confirming');
      const delivered = await deliverCourseTransactions({ store: courseStore, token, accountToken: intent.accountToken,
        transactions: [result.transaction], isCurrent: () => current(id) });
      if (!current(id)) return false;
      if (delivered.delivered.includes(courseId)) {
        setPhase('success'); setMessage('Покупка подтверждена. Курс открыт.'); courseAccessChanged(); return true;
      }
      setPhase('pending'); setMessage(waiting); return false;
    } catch {
      if (current(id)) { setPhase(charged ? 'pending' : 'error'); setMessage(charged ? waiting : 'Не удалось завершить покупку. Проверьте подключение и попробуйте ещё раз.'); }
      return false;
    } finally { busy.current = false; }
  }, [current]);
  return <Context.Provider value={{ catalog, products, phase, message, available: !!courseStore,
    buy, restore: () => sync(true), retry: () => sync(true) }}>{children}</Context.Provider>;
}
export const useCoursePurchases = () => useContext(Context);
