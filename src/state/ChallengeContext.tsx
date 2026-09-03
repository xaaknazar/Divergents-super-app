// Tracks the live daily challenge: metric inputs (steps, pages) and the binary
// "no sugar" toggle. Today's points (incl. over-goal bonus) roll up into the
// team leaderboard so the user's rank updates live. The active challenge and
// its full team are loaded from the website API; the user's daily inputs are
// persisted on-device so progress survives app launches.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';
import { loadJSON, saveJSON } from './persist';
import {
  DEFAULT_CHALLENGE, Challenge, ChallengeTask, Member, fetchActiveChallenge, fetchChallenges, postChallengeProgress,
  challengePointsToday, challengeBonusToday, taskPoints, taskBonus, taskDone, totalFlags,
  DEFAULT_REPORT_DEADLINE_HOUR,
} from '../data/community';
import { expectedChallengeDay, isChallengeDayLocked } from '../data/challengeDay';

export interface RankedMember extends Member { rank: number; points: number }

interface ChallengeState {
  challenge: Challenge;
  loading: boolean;
  /** Последняя загрузка активного челленджа с сервера не удалась. */
  error: boolean;
  isParticipant: boolean;
  syncPending: boolean;
  dayLocked: boolean;
  setMetric: (taskId: string, value: number) => void;
  toggleBinary: (taskId: string) => void;
  pointsToday: number;
  bonusToday: number;
  leaderboard: RankedMember[];
  myRank: number;
  teamPoints: number;
  // Team-wide disciplinary totals — visible to every member.
  teamFlags: number;
  teamPenalty: number;
  /** Перечитать активный челлендж с сервера (например, после его удаления). */
  refresh: () => Promise<boolean>;
}

const Ctx = createContext<ChallengeState | null>(null);

const PROGRESS_KEY = 'dvg.challengeProgress.v1';
const PENDING_KEY = 'dvg.challengeProgressPending.v1';
const REMINDER_KEY = 'dvg.challengeReminder.v1';
const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000;

interface SavedProgress {
  id: string;
  day: number;
  tasks: { id: string; current?: number; done?: boolean }[];
}

interface PendingUpdate {
  taskId: string;
  value?: number;
  done?: boolean;
}

interface SavedPending {
  id: string;
  day: number;
  updates: PendingUpdate[];
}

interface SavedReminder {
  id: string;
  day: number;
  notificationId: string;
  scheduledFor: string;
}

// Challenge deadlines use Asia/Almaty (UTC+5), regardless of the phone's
// current timezone. Kazakhstan has no daylight-saving transition.
function almatyTimeToday(hour: number, minute: number, nowMs: number): number {
  const shifted = new Date(nowMs + ALMATY_OFFSET_MS);
  return Date.UTC(
    shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), hour, minute,
  ) - ALMATY_OFFSET_MS;
}

function nextAlmatyTime(hour: number, minute: number, nowMs = Date.now()): number {
  const today = almatyTimeToday(hour, minute, nowMs);
  return today > nowMs ? today : today + 24 * 60 * 60 * 1000;
}

// Overlay persisted daily inputs onto a challenge's task definitions (only when
// the saved progress belongs to the same challenge).
function applyProgress(base: Challenge, saved: SavedProgress | null): Challenge {
  if (!saved || saved.id !== base.id || saved.day !== base.currentDay) return base;
  return {
    ...base,
    tasks: base.tasks.map((t) => {
      const s = saved.tasks.find((x) => x.id === t.id);
      if (!s) return t;
      if (t.kind === 'metric') return { ...t, current: Math.max(0, s.current ?? t.current) };
      return { ...t, done: s.done ?? t.done };
    }),
  };
}

function toSaved(c: Challenge): SavedProgress {
  return {
    id: c.id,
    day: c.currentDay,
    tasks: c.tasks.map((t) => (t.kind === 'metric' ? { id: t.id, current: t.current } : { id: t.id, done: t.done })),
  };
}

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [challenge, setChallenge] = useState<Challenge>(DEFAULT_CHALLENGE);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [timeTick, setTimeTick] = useState(() => Date.now());
  const savedRef = useRef<SavedProgress | null>(null);
  const pendingRef = useRef<SavedPending | null>(null);
  const flushingRef = useRef(false);
  // Про закрытый день предупреждаем один раз за день, а не на каждую отметку.
  const deadlineNoticeRef = useRef<string | null>(null);
  // Keep the latest getToken in a ref so the load effect can run once without
  // re-subscribing every time Clerk hands back a new function identity.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const savePending = useCallback((pending: SavedPending | null) => {
    pendingRef.current = pending;
    setPendingCount(pending?.updates.length ?? 0);
    saveJSON(PENDING_KEY, pending);
  }, []);

  // Отметку, которую сервер не принял из-за дедлайна, из очереди убираем: иначе
  // приложение переотправляло бы её каждые 20 секунд до конца челленджа.
  const dropPending = useCallback((challengeId: string, day: number, taskId: string) => {
    const latest = pendingRef.current;
    if (!latest || latest.id !== challengeId || latest.day !== day) return;
    const remaining = latest.updates.filter((item) => item.taskId !== taskId);
    savePending(remaining.length ? { ...latest, updates: remaining } : null);
  }, [savePending]);

  const warnDeadlinePassed = useCallback((challengeId: string, day: number, hour?: number) => {
    const key = `${challengeId}:${day}`;
    if (deadlineNoticeRef.current === key) return;
    deadlineNoticeRef.current = key;
    const h = typeof hour === 'number' && hour > 0 ? hour : DEFAULT_REPORT_DEADLINE_HOUR;
    Alert.alert(
      'Отметки на сегодня закрыты',
      `Отметки принимаются до ${h}:00 по Алматы включительно. Эта отметка не сохранена и в зачёт дня не попадёт — следующий день откроется в 00:00.`,
    );
  }, []);

  // Refresh without replacing valid on-screen data during a temporary outage.
  // A successful `{ challenge: null }` is different: it means the participant
  // no longer has an active challenge and the card should be removed.
  const refreshLive = useCallback(async (): Promise<boolean> => {
    if (!isSignedIn) return false;
    try {
      const token = await getTokenRef.current();
      const { challenge: live, members: nextMembers, ok } = await fetchActiveChallenge(token);
      if (!ok) { setError(true); return false; }
      setError(false);
      const belongsToUser = !!live && nextMembers.some((member) => member.isMe);
      if (live && belongsToUser) {
        // Older `/active` payloads do not include startISO. Read it from the
        // public catalog so the client can detect and lock a stale server day.
        if (!live.startISO) {
          const catalog = await fetchChallenges().catch(() => []);
          live.startISO = catalog.find((item) => item.id === live.id)?.startISO;
        }
        const next = applyProgress(live, savedRef.current);
        setChallenge(next);
        setMembers(nextMembers);
        // A server-side day rollover invalidates yesterday's local snapshot.
        if (savedRef.current?.id !== next.id || savedRef.current?.day !== next.currentDay) {
          const snap = toSaved(next);
          savedRef.current = snap;
          saveJSON(PROGRESS_KEY, snap);
        }
      } else {
        setChallenge(DEFAULT_CHALLENGE);
        setMembers([]);
      }
      return true;
    } catch {
      setError(true);
      return false;
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (loading || challenge.id === DEFAULT_CHALLENGE.id) return;
    const timer = setInterval(() => setTimeTick(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [challenge.id, loading]);

  // Load persisted progress first, then enrich with the server's active
  // challenge + leaderboard (re-applying the saved daily inputs by task id).
  useEffect(() => {
    let alive = true;
    if (isSignedIn) setLoading(true);
    (async () => {
      try {
        const saved = await loadJSON<SavedProgress | null>(PROGRESS_KEY, null);
        savedRef.current = saved;
        if (alive && saved && saved.id === DEFAULT_CHALLENGE.id) {
          setChallenge(applyProgress(DEFAULT_CHALLENGE, saved));
        }
        const pending = await loadJSON<SavedPending | null>(PENDING_KEY, null);
        pendingRef.current = pending;
        if (alive) setPendingCount(pending?.updates.length ?? 0);
        if (!isSignedIn) {
          if (alive) { setChallenge(DEFAULT_CHALLENGE); setMembers([]); setError(false); }
          return;
        }
        await refreshLive();
      } catch {
        // best-effort: keep the locally-restored challenge on any failure
        if (alive) setError(true);
      } finally {
        // Always clear loading, even if getToken()/fetch throws — otherwise the
        // screen would spin forever.
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isSignedIn, refreshLive]);

  // Every tap is persisted locally first and queued before the network request.
  // A failed request remains in the queue and is retried while the app is open,
  // so there is no separate end-of-day report the participant can forget.
  const syncTask = useCallback((challengeId: string, day: number, body: PendingUpdate, rollback?: () => void) => {
    if (!challengeId || challengeId === DEFAULT_CHALLENGE.id) return;
    const previous = pendingRef.current;
    const updates = previous?.id === challengeId && previous.day === day ? previous.updates : [];
    savePending({
      id: challengeId,
      day,
      updates: [...updates.filter((item) => item.taskId !== body.taskId), body],
    });
    Promise.resolve(getTokenRef.current())
      .then(async (token) => {
        const res = await postChallengeProgress(challengeId, body, token);
        if (!res.ok) {
          // День закрыт — оптимистичную запись откатываем, иначе на экране
          // «сохранено», а сервер этой отметки не знает.
          if (res.reason === 'deadline_passed') {
            dropPending(challengeId, day, body.taskId);
            rollback?.();
            warnDeadlinePassed(challengeId, day, res.deadlineHour);
          }
          return;
        }
        const latest = pendingRef.current;
        if (!latest || latest.id !== challengeId || latest.day !== day) return;
        const queued = latest.updates.find((item) => item.taskId === body.taskId);
        if (!queued || queued.value !== body.value || queued.done !== body.done) return;
        const remaining = latest.updates.filter((item) => item.taskId !== body.taskId);
        savePending(remaining.length ? { ...latest, updates: remaining } : null);
      })
      .catch(() => {});
  }, [dropPending, savePending, warnDeadlinePassed]);

  const flushPending = useCallback(async () => {
    if (flushingRef.current || !isSignedIn || challenge.id === DEFAULT_CHALLENGE.id) return;
    const pending = pendingRef.current;
    if (!pending) return;
    if (pending.id !== challenge.id || pending.day !== challenge.currentDay) {
      // Отметки за прошлый день сервер уже не примет (дедлайн). Раньше очередь
      // просто стиралась, и человек был уверен, что его вчерашний офлайн-ввод
      // ушёл в зачёт.
      const stale = pending.id === challenge.id && pending.updates.length > 0;
      savePending(null);
      if (stale) warnDeadlinePassed(challenge.id, pending.day);
      return;
    }
    flushingRef.current = true;
    try {
      const token = await getTokenRef.current();
      for (const update of [...pending.updates]) {
        const res = await postChallengeProgress(challenge.id, update, token);
        if (!res.ok) {
          if (res.reason !== 'deadline_passed') break;
          // Отложенная отметка опоздала: выбрасываем её из очереди и сбрасываем
          // локальный снимок дня, чтобы экран показал то, что реально у сервера.
          dropPending(challenge.id, challenge.currentDay, update.taskId);
          warnDeadlinePassed(challenge.id, challenge.currentDay, res.deadlineHour);
          savedRef.current = null;
          saveJSON(PROGRESS_KEY, null);
          refreshLive();
          continue;
        }
        const latest = pendingRef.current;
        if (!latest || latest.id !== challenge.id || latest.day !== challenge.currentDay) break;
        const queued = latest.updates.find((item) => item.taskId === update.taskId);
        if (queued && queued.value === update.value && queued.done === update.done) {
          const remaining = latest.updates.filter((item) => item.taskId !== update.taskId);
          savePending(remaining.length ? { ...latest, updates: remaining } : null);
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [challenge.id, challenge.currentDay, dropPending, isSignedIn, refreshLive, savePending, warnDeadlinePassed]);

  // Retry failed writes while the app is open.
  useEffect(() => {
    if (loading || !isSignedIn || challenge.id === DEFAULT_CHALLENGE.id) return;
    flushPending();
    const timer = setInterval(flushPending, 20_000);
    return () => clearInterval(timer);
  }, [challenge.id, challenge.currentDay, flushPending, isSignedIn, loading]);

  // Coming back to the app must show the server's latest day, penalties and
  // leaderboard. Flush first so a mark made before backgrounding is not lost.
  useEffect(() => {
    if (!isSignedIn) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      flushPending().finally(() => refreshLive());
    });
    return () => sub.remove();
  }, [flushPending, isSignedIn, refreshLive]);

  // At 23:01 Almaty the server closes the day. Refresh at the boundary and a
  // few times afterwards to tolerate a delayed cron invocation. A lightweight
  // five-minute refresh also keeps ranks current while the tracker is open.
  useEffect(() => {
    if (loading || !isSignedIn || challenge.id === DEFAULT_CHALLENGE.id) return;
    const now = Date.now();
    const rolloverAt = nextAlmatyTime(23, 1, now);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const preCloseDelay = rolloverAt - 10_000 - now;
    if (preCloseDelay > 0) timers.push(setTimeout(() => { flushPending(); }, preCloseDelay));
    for (const extraDelay of [5_000, 30_000, 60_000, 120_000, 300_000]) {
      timers.push(setTimeout(() => {
        flushPending().finally(() => refreshLive());
      }, Math.max(0, rolloverAt + extraDelay - now)));
    }
    const refreshTimer = setInterval(refreshLive, 5 * 60_000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(refreshTimer);
    };
  }, [challenge.id, challenge.currentDay, flushPending, isSignedIn, loading, refreshLive]);

  // Напоминание «отметьте цели» в 22:00 шлёт СЕРВЕР (lib/challenge-reminder.ts)
  // — тем же текстом, по реальным отметкам и с защитой от повтора. Локальное
  // расписание давало участнику второе уведомление через минуту, поэтому его
  // здесь больше нет: гасим только то, что запланировала прошлая версия.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      const previous = await loadJSON<SavedReminder | null>(REMINDER_KEY, null);
      if (!previous || cancelled) return;
      await Notifications.cancelScheduledNotificationAsync(previous.notificationId).catch(() => {});
      saveJSON(REMINDER_KEY, null);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((c: Challenge) => {
    const snap = toSaved(c);
    savedRef.current = snap;
    saveJSON(PROGRESS_KEY, snap);
  }, []);

  // Откат оптимистичной записи, когда сервер отметку не принял.
  const revertTask = useCallback((taskId: string, restore: { value?: number; done?: boolean }) => {
    setChallenge((prev) => {
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          if (t.kind === 'metric' && restore.value !== undefined) return { ...t, current: restore.value };
          if (t.kind === 'binary' && restore.done !== undefined) return { ...t, done: restore.done };
          return t;
        }),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  const setMetric = useCallback((taskId: string, value: number) => {
    const safe = Math.max(0, value);
    setChallenge((prev) => {
      if (isChallengeDayLocked(prev)) return prev;
      const before = prev.tasks.find((t) => t.id === taskId);
      const previousValue = before && before.kind === 'metric' ? before.current : 0;
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId && t.kind === 'metric' ? { ...t, current: safe } : t),
      };
      persist(next);
      syncTask(next.id, next.currentDay, { taskId, value: safe }, () => revertTask(taskId, { value: previousValue }));
      return next;
    });
  }, [persist, revertTask, syncTask]);

  const toggleBinary = useCallback((taskId: string) => {
    setChallenge((prev) => {
      if (isChallengeDayLocked(prev)) return prev;
      const before = prev.tasks.find((t) => t.id === taskId);
      const previousDone = before && before.kind === 'binary' ? before.done : false;
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId && t.kind === 'binary' ? { ...t, done: !t.done } : t),
      };
      const updated = next.tasks.find((t) => t.id === taskId);
      const done = updated && updated.kind === 'binary' ? updated.done : undefined;
      persist(next);
      if (done !== undefined) {
        syncTask(next.id, next.currentDay, { taskId, done }, () => revertTask(taskId, { done: previousDone }));
      }
      return next;
    });
  }, [persist, revertTask, syncTask]);

  const value = useMemo<ChallengeState>(() => {
    const me = members.find((m) => m.isMe) ?? null;
    const myEliminated = me?.eliminated === true || challenge.eliminated === true;
    // Коэффициент участника приходит с сервера и умножает ВЕСЬ день — без него
    // участница с ×1.5 весь день видела две трети своих настоящих баллов.
    const myCoefficient = me?.coefficient ?? 1;
    // У выбывшего очки заморожены сервером: живого счётчика за сегодня нет.
    const pointsToday = myEliminated ? (me?.day ?? 0) : challengePointsToday(challenge.tasks, myCoefficient);
    const bonusToday = myEliminated ? 0 : challengeBonusToday(challenge.tasks);

    // Every member's total includes today's server-reported points. For the
    // signed-in user, use the local optimistic value so the row updates instantly.
    // Eliminated members are already frozen by the server.
    const ranked = members
      .map((m) => {
        const dayPoints = m.isMe && !m.eliminated ? pointsToday : m.day;
        const points = m.weekBase + dayPoints;
        const todayTasks = m.isMe && !m.eliminated
          ? challenge.tasks.map((task) => {
              const serverTask = m.todayTasks.find((item) => item.id === task.id);
              if (task.kind === 'metric') {
                return {
                  id: task.id,
                  kind: 'metric' as const,
                  title: task.title,
                  icon: task.icon,
                  unit: task.unit,
                  target: task.min,
                  value: task.current,
                  done: false,
                  marked: serverTask?.marked === true || task.current > 0,
                  completed: task.current >= task.min,
                };
              }
              return {
                id: task.id,
                kind: 'binary' as const,
                title: task.title,
                icon: task.icon,
                unit: '',
                target: null,
                value: 0,
                done: task.done,
                marked: serverTask?.marked === true || task.done,
                completed: task.done,
              };
            })
          : m.todayTasks;
        return { ...m, day: dayPoints, points, todayTasks };
      })
      .sort((a, b) => b.points - a.points)
      .map((m, i) => ({
        ...m,
        rank: i + 1,
        rankChange: m.previousRank == null ? null : m.previousRank - (i + 1),
        averagePoints: Math.round((m.points / Math.max(1, challenge.currentDay)) * 10) / 10,
      }));

    const myRank = ranked.find((m) => m.isMe)?.rank ?? 0;
    // Очки команды берём у сервера: рядом с этим числом показывается место
    // команды, тоже серверное, а локальная сумма (с подстановкой своих
    // сегодняшних баллов) давала другую цифру, чем экран «Рейтинг команд».
    const serverTeamPoints = (challenge.teamStandings ?? []).find((t) => t.isMine)?.points;
    const teamPoints = typeof serverTeamPoints === 'number'
      ? serverTeamPoints
      : ranked.reduce((s, m) => s + m.points, 0);
    // Team-wide discipline totals — every member sees the team's 🚩 and штрафы.
    const teamFlags = ranked.reduce((s, m) => s + totalFlags(m.flags), 0);
    const teamPenalty = ranked.reduce((s, m) => {
      const explicit = m.penalty ?? 0;
      return s + (explicit < 0 ? explicit : -100 * totalFlags(m.flags));
    }, 0);

    return {
      challenge, loading, error, isParticipant: challenge.id !== DEFAULT_CHALLENGE.id && members.some((m) => m.isMe),
      syncPending: pendingCount > 0,
      dayLocked: isChallengeDayLocked(challenge, timeTick),
      setMetric, toggleBinary, pointsToday, bonusToday,
      leaderboard: ranked, myRank, teamPoints, teamFlags, teamPenalty,
      refresh: refreshLive,
    };
  }, [challenge, members, loading, error, pendingCount, setMetric, timeTick, toggleBinary, refreshLive]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChallenge() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChallenge must be used within ChallengeProvider');
  return c;
}

export { taskPoints, taskBonus, taskDone };
