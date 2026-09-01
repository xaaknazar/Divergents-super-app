// Persisted set of "signups": sport, trips, lectures, course bookmarks.
// Keys are namespaced, e.g. 'sport:football', 'trip:kolsai', 'lecture:lec1', 'bookmark:<courseId>'.
//
// Записи на поездки и спорт хранятся ВМЕСТЕ СО СТАТУСОМ: 'pending' — заявка на
// рассмотрении, 'approved' — человек действительно записан. Раньше это был
// плоский список ключей, поэтому отклонённый заявитель видел «Вы записаны ✓».
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import { fetchMySport, fetchMyTrips, EnrollStatus } from '../data/api';

const KEY = 'dvg.enrollments';

export type { EnrollStatus };

type EnrollMap = Record<string, EnrollStatus>;

// Ключи, за которые отвечает сервер: их список он и перезаписывает целиком.
const isServerKey = (k: string) => k.startsWith('trip:') || k.startsWith('sport:');

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
      out[k] = s === 'pending' ? 'pending' : 'approved';
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
}

const Ctx = createContext<EnrollState | null>(null);

export function EnrollmentProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const [map, setMap] = useState<EnrollMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isSignedIn === false) {
      setMap({});
      setReady(true);
      saveJSON(KEY, {});
      return;
    }
    loadJSON<unknown>(KEY, {}).then((v) => { setMap(normalizeStored(v)); setReady(true); });
  }, [isSignedIn]);

  // Server membership is authoritative. Раньше серверные id только ДОБАВЛЯЛИСЬ
  // к локальному кэшу, поэтому отклонённая заявка оставалась в телефоне
  // навсегда. Теперь ответ сервера ЗАМЕЩАЕТ все trip:/sport: ключи — если
  // заявку отклонили или запись отменили, она исчезает и здесь.
  useEffect(() => {
    if (!isSignedIn) return;
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        const [trips, sport] = await Promise.all([fetchMyTrips(token), fetchMySport(token)]);
        if (!alive) return;
        setMap((previous) => {
          const next: EnrollMap = {};
          // Локальные ключи вне зоны сервера (закладки, избранное) сохраняем.
          for (const [k, s] of Object.entries(previous)) if (!isServerKey(k)) next[k] = s;
          for (const t of trips) next[`trip:${t.id}`] = t.status;
          for (const s of sport) next[`sport:${s.id}`] = s.status;
          saveJSON(KEY, next);
          return next;
        });
      } catch {
        // Keep the local cache when the website is temporarily unavailable.
      }
    })();
    return () => { alive = false; };
  }, [isSignedIn]);

  const value = useMemo<EnrollState>(() => ({
    ready,
    has: (k) => map[k] != null,
    statusOf: (k) => map[k] ?? null,
    isApproved: (k) => map[k] === 'approved',
    add: (k, status = 'approved') => setMap((p) => {
      if (p[k] === status) return p;
      const n = { ...p, [k]: status };
      saveJSON(KEY, n);
      return n;
    }),
    remove: (k) => setMap((p) => {
      if (p[k] == null) return p;
      const n = { ...p };
      delete n[k];
      saveJSON(KEY, n);
      return n;
    }),
    toggle: (k) => setMap((p) => {
      const n = { ...p };
      if (n[k] != null) delete n[k]; else n[k] = 'approved';
      saveJSON(KEY, n);
      return n;
    }),
  }), [map, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEnrollment() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEnrollment must be used within EnrollmentProvider');
  return c;
}
