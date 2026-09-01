import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { AppNotification, fetchNotifications, markNotificationsRead } from '../data/notifications';
import { loadJSON, saveJSON } from './persist';

export type NotificationItem = AppNotification & { read: boolean };

// The stored set is only an offline optimisation on top of the server's read
// marks, so it never has to hold more than the window the feed can show.
const MAX_READ_IDS = 200;

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

  // MERGE the persisted set into state instead of overwriting it: a markRead
  // that fired before this load resolved used to be thrown away and the row
  // popped back to unread.
  useEffect(() => {
    loadJSON<string[]>(KEY, []).then((saved) => {
      if (!Array.isArray(saved) || !saved.length) return;
      setReadIds((p) => (p.length ? Array.from(new Set([...saved, ...p])) : saved));
    });
  }, []);

  // `silent` skips the global `loading` toggle. The bell badge lives on several
  // screens via useNotifications, so toggling `loading` re-renders all of them —
  // that churn (during the modal-open animation) is what made opening the
  // notifications screen janky. Screen-open + pull-to-refresh pass silent=true.
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const token = isSignedIn ? await getTokenRef.current() : null;
      const feed = await fetchNotifications(token);
      setList(feed.items);
      // Prune the local set to the window the server just returned: it exists
      // only to cover the gap before the next fetch, and would otherwise grow
      // without bound as notifications age out of the feed.
      if (feed.items.length) {
        const live = new Set(feed.items.map((x) => x.id));
        setReadIds((p) => {
          const next = p.filter((id) => live.has(id)).slice(-MAX_READ_IDS);
          if (next.length !== p.length) saveJSON(KEY, next);
          return next.length === p.length ? p : next;
        });
      }
    } catch {
      // Keep any already-loaded notifications on a transient refresh failure
      // (this same fn backs pull-to-refresh) — only flag the error state.
      setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => { refresh(); }, [refresh]);

  // Persist the read marks on the SERVER (per user) — the local set below only
  // keeps the UI right until the next fetch and while offline.
  const pushRead = useCallback(async (ids: string[]) => {
    if (!ids.length || !isSignedIn) return;
    try {
      const token = await getTokenRef.current();
      const ok = await markNotificationsRead(token, ids);
      // Reflect the server state immediately so a later refresh (or another
      // device) agrees without waiting for a round trip.
      if (ok) setList((p) => p.map((x) => (ids.includes(x.id) ? { ...x, read: true } : x)));
    } catch {}
  }, [isSignedIn]);

  const markRead = useCallback((id: string) => {
    setReadIds((p) => {
      if (p.includes(id)) return p;
      const n = [...p, id].slice(-MAX_READ_IDS);
      saveJSON(KEY, n);
      return n;
    });
    void pushRead([id]);
  }, [pushRead]);

  // Mark every currently-loaded notification as read (explicit user action).
  const markAllRead = useCallback(() => {
    const ids = list.map((x) => x.id);
    setReadIds((p) => {
      const next = Array.from(new Set([...p, ...ids])).slice(-MAX_READ_IDS);
      saveJSON(KEY, next);
      return next;
    });
    void pushRead(ids);
  }, [list, pushRead]);

  // Read = what the server knows OR what this device marked since the last
  // fetch. The count therefore comes from the server (and survives reinstall /
  // matches other devices) without losing the optimistic local marks.
  const items = useMemo<NotificationItem[]>(
    () => list.map((x) => ({ ...x, read: x.read || readIds.includes(x.id) })),
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
