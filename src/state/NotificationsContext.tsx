import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { AppNotification, fetchNotifications } from '../data/notifications';
import { loadJSON, saveJSON } from './persist';

export type NotificationItem = AppNotification & { read: boolean };

interface NotifState {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const Ctx = createContext<NotifState | null>(null);
const KEY = 'dvg.readNotifs';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [list, setList] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { loadJSON<string[]>(KEY, []).then(setReadIds); }, []);

  const refresh = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const token = isSignedIn ? await getToken() : null;
      const data = await fetchNotifications(token);
      setList(data);
    } catch {
      setError(true);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

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
