import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { NOTIFICATIONS, AppNotification } from '../data/notifications';
import { loadJSON, saveJSON } from './persist';

interface NotifState {
  items: (AppNotification & { read: boolean })[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const Ctx = createContext<NotifState | null>(null);
const KEY = 'dvg.readNotifs';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [readIds, setReadIds] = useState<string[]>([]);
  useEffect(() => { loadJSON<string[]>(KEY, []).then(setReadIds); }, []);

  const markRead = useCallback((id: string) => {
    setReadIds((p) => { if (p.includes(id)) return p; const n = [...p, id]; saveJSON(KEY, n); return n; });
  }, []);
  const markAllRead = useCallback(() => {
    const all = NOTIFICATIONS.map((x) => x.id); setReadIds(all); saveJSON(KEY, all);
  }, []);

  const items = useMemo(() => NOTIFICATIONS.map((x) => ({ ...x, read: readIds.includes(x.id) })), [readIds]);
  const unread = items.filter((x) => !x.read).length;

  const value = useMemo<NotifState>(() => ({ items, unread, markRead, markAllRead }), [items, unread, markRead, markAllRead]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useNotifications must be used within NotificationsProvider');
  return c;
}
