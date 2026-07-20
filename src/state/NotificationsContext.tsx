import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { AppNotification, fetchNotifications } from '../data/notifications';
import { loadJSON, saveJSON } from './persist';

export type NotificationItem = AppNotification & { read: boolean };

interface NotifState {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: boolean;
  refresh: (silent?: boolean) => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const Ctx = createContext<NotifState | null>(null);
const KEY = 'dvg.readNotifs';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  // Clerk hands back a NEW getToken function every render. Keep it in a ref so
  // `refresh` (and the effects that depend on it) stay stable — otherwise the
  // mount effect re-runs on every render → an endless refetch loop that made the
  // notifications screen flicker between empty/list and freeze.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [list, setList] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { loadJSON<string[]>(KEY, []).then(setReadIds); }, []);

  // `silent` skips the global `loading` toggle. The bell badge lives on several
  // screens via useNotifications, so toggling `loading` re-renders all of them —
  // that churn (during the modal-open animation) is what made opening the
  // notifications screen janky. Screen-open + pull-to-refresh pass silent=true.
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const token = isSignedIn ? await getTokenRef.current() : null;
      const data = await fetchNotifications(token);
      setList(data);
    } catch {
      // Keep any already-loaded notifications on a transient refresh failure
      // (this same fn backs pull-to-refresh) — only flag the error state.
      setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => { refresh(); }, [refresh]);

  const markRead = useCallback((id: string) => {
    setReadIds((p) => { if (p.includes(id)) return p; const n = [...p, id]; saveJSON(KEY, n); return n; });
  }, []);

  // Mark every currently-loaded notification as read (explicit user action).
  const markAllRead = useCallback(() => {
    setReadIds((p) => {
      const next = Array.from(new Set([...p, ...list.map((x) => x.id)]));
      saveJSON(KEY, next);
      return next;
    });
  }, [list]);

  const items = useMemo<NotificationItem[]>(
    () => list.map((x) => ({ ...x, read: readIds.includes(x.id) })),
    [list, readIds],
  );
  const unread = items.filter((x) => !x.read).length;

  const value = useMemo<NotifState>(
    () => ({ items, unread, loading, error, refresh, markRead, markAllRead }),
    [items, unread, loading, error, refresh, markRead, markAllRead],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useNotifications must be used within NotificationsProvider');
  return c;
}
