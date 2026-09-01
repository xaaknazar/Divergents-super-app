// Notifications are published server-side by the Divergents admin and fetched
// live, so every user sees the same real feed. No hardcoded/seed data lives in
// the app: on failure or empty the list is [] and the UI renders an empty state.
import { SFName } from '../components/SFIcon';
import { API_BASE } from './api';

export type NotifKind = 'challenge' | 'course' | 'community' | 'place' | 'career' | 'system';

// Where a notification row should take the user when tapped. Kept loosely typed
// (string names) so this data module stays independent of the navigation types;
// the screen validates/dispatches it.
export interface NotifTarget {
  tab: string;            // e.g. CareerTab
  // Optional: the admin may target a TAB only (no specific screen). Such a row
  // is still actionable — it opens the tab — so it keeps its chevron.
  screen?: string | null; // e.g. 'CourseDetail'
  params?: Record<string, string>;
}

export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  date: string;
  icon: SFName;
  color: string;
  target?: NotifTarget | null;
  /** Server-side read state (per user, survives reinstall). */
  read: boolean;
}

/** Feed + the server's authoritative unread count for the signed-in user. */
export interface NotificationsFeed {
  items: AppNotification[];
  unread: number;
}

export const KIND_META: Record<NotifKind, { icon: SFName; color: string }> = {
  challenge: { icon: 'flame.fill', color: '#FF3B30' },
  course:    { icon: 'book.fill', color: '#234088' },
  community: { icon: 'person.3.fill', color: '#3D5BDB' },
  place:     { icon: 'mappin.circle.fill', color: '#0EA5E9' },
  career:    { icon: 'briefcase.fill', color: '#16A34A' },
  system:    { icon: 'sparkles', color: '#AF52DE' },
};

const KINDS: NotifKind[] = ['challenge', 'course', 'community', 'place', 'career', 'system'];
const isKind = (v: unknown): v is NotifKind => typeof v === 'string' && (KINDS as string[]).includes(v);

interface ApiNotification {
  id?: unknown;
  kind?: unknown;
  title?: unknown;
  body?: unknown;
  date?: unknown;
  read?: unknown;
  target?: { tab?: unknown; screen?: unknown; params?: unknown } | null;
}

// A target needs a tab; `screen` is optional. Requiring it used to drop the
// whole target when the admin picked a tab only, leaving an inert row with no
// chevron even though the tab was a perfectly good destination.
function mapTarget(t: ApiNotification['target']): NotifTarget | null {
  if (!t || typeof t.tab !== 'string' || !t.tab) return null;
  const params: Record<string, string> = {};
  if (t.params && typeof t.params === 'object') {
    for (const [k, v] of Object.entries(t.params as Record<string, unknown>)) {
      if (typeof v === 'string') params[k] = v;
      else if (typeof v === 'number') params[k] = String(v);
    }
  }
  return {
    tab: t.tab,
    screen: typeof t.screen === 'string' && t.screen ? t.screen : null,
    params: Object.keys(params).length ? params : undefined,
  };
}

function mapNotification(n: ApiNotification): AppNotification | null {
  if (!n || typeof n.id !== 'string') return null;
  const kind: NotifKind = isKind(n.kind) ? n.kind : 'system';
  const meta = KIND_META[kind];
  return {
    id: n.id,
    kind,
    title: typeof n.title === 'string' ? n.title : '',
    body: typeof n.body === 'string' ? n.body : '',
    date: typeof n.date === 'string' ? n.date : '',
    icon: meta.icon,
    color: meta.color,
    target: mapTarget(n.target),
    read: n.read === true,
  };
}

// Live feed. The admin publishes announcements on the website and the server
// also addresses personal notifications to the signed-in user; both come back
// here, each already carrying its server-side `read` flag.
export async function fetchNotifications(token?: string | null): Promise<NotificationsFeed> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/mobile/notifications`, { signal: ctrl.signal, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list: ApiNotification[] = Array.isArray(data?.notifications)
      ? data.notifications
      : Array.isArray(data) ? data : [];
    const items = list.map(mapNotification).filter((x): x is AppNotification => x !== null);
    const unread = typeof data?.unread === 'number' && isFinite(data.unread)
      ? Math.max(0, data.unread)
      : items.filter((x) => !x.read).length;
    return { items, unread };
  } finally {
    // NB: we intentionally do NOT swallow errors here — the caller
    // (NotificationsContext) catches them to drive its retryable error state.
    // A successful-but-empty response still resolves to an empty feed.
    clearTimeout(timer);
  }
}

/**
 * POST /api/mobile/notifications/read — persist read marks for the signed-in
 * user so they survive a reinstall and apply on every device. Best effort: the
 * local set (NotificationsContext) keeps the UI right while offline.
 */
export async function markNotificationsRead(token: string | null | undefined, ids: string[]): Promise<boolean> {
  if (!token || !ids.length) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/notifications/read`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: ids.slice(0, 200) }),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
