// Persisted set of "signups": sport, trips, lectures, course bookmarks.
// Keys are namespaced, e.g. 'sport:football', 'trip:kolsai', 'lecture:lec1', 'bookmark:<courseId>'.
//
// Записи на поездки и спорт хранятся ВМЕСТЕ СО СТАТУСОМ: 'pending' — заявка на
// рассмотрении, 'approved' — человек действительно записан. Раньше это был
// плоский список ключей, поэтому отклонённый заявитель видел «Вы записаны ✓».
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import { fetchMySport, fetchMyTrips, fetchMyMeetups, EnrollStatus } from '../data/api';

const KEY = 'dvg.enrollments';

export type { EnrollStatus };

type EnrollMap = Record<string, EnrollStatus>;

// Ключи, за которые отвечает сервер: их список он и перезаписывает целиком.
// Ключи, правду о которых знает сервер: его ответ их замещает целиком.
// Всё остальное (избранное, закладки) живёт только на устройстве.
const isServerKey = (k: string) =>
  k.startsWith('trip:') || k.startsWith('sport:') || k.startsWith('meetup:');

// На диске раньше лежал string[]. Читаем оба формата, чтобы обновление
// приложения не стирало локальные закладки и избранное.
function normalizeStored(v: unknown): EnrollMap {
  if (Array.isArray(v)) {
    const out: EnrollMap = {};
    for (const k of v) if (typeof k === 'string' && k) out[k] = 'approved';
    return out;
  }
  if (v && typeof v === 'object') {
    const out: EnrollMap = {};
    for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
      if (!k) continue;
      if (s === 'pending' || s === 'approved') out[k] = s;
    }
    return out;
  }
  return {};
}

interface EnrollState {
  /** Записан ИЛИ подана заявка — «эта карточка моя». */
  has: (k: string) => boolean;
  /** Точный статус: 'approved' | 'pending' | null. */
  statusOf: (k: string) => EnrollStatus | null;
  /** Только подтверждённое участие (метка на карте, «Вы идёте»). */
  isApproved: (k: string) => boolean;
  toggle: (k: string) => void;
  add: (k: string, status?: EnrollStatus) => void;
  remove: (k: string) => void;
  ready: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<EnrollState | null>(null);
export { Ctx as EnrollmentStateContext };

export function EnrollmentProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, getToken } = useAuth();
  const key = `${KEY}:${userId ?? 'guest'}`;
  const tokenRef = useRef(getToken); tokenRef.current = getToken;
  const accountRef = useRef(userId); accountRef.current = userId;
  const revision = useRef(0);
  const [map, setMap] = useState<EnrollMap>({});
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    const currentRevision = ++revision.current;
    try {
      const token = await tokenRef.current();
      const [trips, sport, meetups] = await Promise.all([
        fetchMyTrips(token, true), fetchMySport(token, true), fetchMyMeetups(token, true),
      ]);
      if (accountRef.current !== userId || revision.current !== currentRevision) return;
      setMap(previous => {
        const next: EnrollMap = {};
        for (const [k, status] of Object.entries(previous)) if (!isServerKey(k)) next[k] = status;
        for (const item of trips) next[`trip:${item.id}`] = item.status;
        for (const item of sport) next[`sport:${item.id}`] = item.status;
        for (const item of meetups) next[`meetup:${item.id}`] = item.status;
        saveJSON(key, next);
        return next;
      });
    } catch { /* Preserve known statuses during a network outage. */ }
  }, [isSignedIn, userId, key]);

  useEffect(() => {
    let alive = true;
    ++revision.current;
    setReady(false); setMap({});
    (async () => {
      const saved = await loadJSON<unknown>(key, null);
      // Migrate only local favorites. Never inherit another account's applications.
      const legacy = saved == null ? normalizeStored(await loadJSON<unknown>(KEY, {})) : {};
      const next = saved == null ? Object.fromEntries(Object.entries(legacy).filter(([k]) => !isServerKey(k))) : normalizeStored(saved);
      if (!alive) return;
      setMap(next); setReady(true);
      await refresh();
    })();
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    const push = Notifications.addNotificationReceivedListener(() => { void refresh(); });
    return () => { alive = false; ++revision.current; foreground.remove(); push.remove(); };
  }, [key, refresh]);

  const value = useMemo<EnrollState>(() => ({
    ready,
    refresh,
    has: (k) => map[k] != null,
    statusOf: (k) => map[k] ?? null,
    isApproved: (k) => map[k] === 'approved',
    add: (k, status = 'approved') => {
      if (accountRef.current !== userId) return;
      ++revision.current;
      setMap((p) => {
      if (p[k] === status) return p;
      const n = { ...p, [k]: status };
      saveJSON(key, n);
      return n;
      });
    },
    remove: (k) => {
      if (accountRef.current !== userId) return;
      ++revision.current;
      setMap((p) => {
      if (p[k] == null) return p;
      const n = { ...p };
      delete n[k];
      saveJSON(key, n);
      return n;
      });
    },
    toggle: (k) => {
      if (accountRef.current !== userId) return;
      ++revision.current;
      setMap((p) => {
      const n = { ...p };
      if (n[k] != null) delete n[k]; else n[k] = 'approved';
      saveJSON(key, n);
      return n;
      });
    },
  }), [map, ready, refresh, key, userId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEnrollment() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEnrollment must be used within EnrollmentProvider');
  return c;
}
