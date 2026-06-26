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
  tab: string;            // e.g. 'LMSTab' | 'CommunityTab' | 'CareerTab' | 'MapTab'
  screen: string;         // e.g. 'CourseDetail'
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
  target?: { tab?: unknown; screen?: unknown; params?: unknown } | null;
}

function mapTarget(t: ApiNotification['target']): NotifTarget | null {
  if (!t || typeof t.tab !== 'string' || typeof t.screen !== 'string') return null;
  const params: Record<string, string> = {};
  if (t.params && typeof t.params === 'object') {
    for (const [k, v] of Object.entries(t.params as Record<string, unknown>)) {
      if (typeof v === 'string') params[k] = v;
      else if (typeof v === 'number') params[k] = String(v);
    }
  }
  return { tab: t.tab, screen: t.screen, params: Object.keys(params).length ? params : undefined };
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
  };
}

// Live feed. The admin publishes notifications on the website; the app reads
// them here. Returns [] (never throws) so the UI degrades to an empty state.
export async function fetchNotifications(token?: string | null): Promise<AppNotification[]> {
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
    return list.map(mapNotification).filter((x): x is AppNotification => x !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
