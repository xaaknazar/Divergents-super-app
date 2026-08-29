// Tracks the live daily challenge: metric inputs (steps, pages) and the binary
// "no sugar" toggle. Today's points (incl. over-goal bonus) roll up into the
// team leaderboard so the user's rank updates live. The active challenge and
// its full team are loaded from the website API; the user's daily inputs are
// persisted on-device so progress survives app launches.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';
import { loadJSON, saveJSON } from './persist';
import {
  DEFAULT_CHALLENGE, Challenge, ChallengeTask, Member, fetchActiveChallenge, fetchChallenges, postChallengeProgress,
  challengePointsToday, challengeBonusToday, taskPoints, taskBonus, taskDone, totalFlags,
} from '../data/community';

export interface RankedMember extends Member { rank: number; points: number }

interface ChallengeState {
  challenge: Challenge;
  loading: boolean;
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

function expectedChallengeDay(c: Challenge, nowMs = Date.now()): number {
  if (!c.startISO) return c.currentDay;
  const startMs = Date.parse(c.startISO);
  if (!Number.isFinite(startMs)) return c.currentDay;
  const start = new Date(startMs + ALMATY_OFFSET_MS);
  const now = new Date(nowMs + ALMATY_OFFSET_MS);
  const startDate = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const nowDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dateOffset = Math.floor((nowDate - startDate) / (24 * 60 * 60 * 1000));
  const afterRollover = now.getUTCHours() * 60 + now.getUTCMinutes() >= 23 * 60 + 1 ? 1 : 0;
  return Math.max(1, dateOffset + 1 + afterRollover);
}

function isChallengeDayLocked(c: Challenge, nowMs = Date.now()): boolean {
  if (c.id === DEFAULT_CHALLENGE.id || c.currentDay <= 0) return false;
  // At 23:01 keep the old server day locked until `/active` advances it. Before
  // 23:01 marks still belong to the current day and are accepted normally.
  return expectedChallengeDay(c, nowMs) > c.currentDay;
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
  const [pendingCount, setPendingCount] = useState(0);
  const [timeTick, setTimeTick] = useState(() => Date.now());
  const savedRef = useRef<SavedProgress | null>(null);
  const pendingRef = useRef<SavedPending | null>(null);
  const reminderRef = useRef<SavedReminder | null>(null);
  const flushingRef = useRef(false);
  // Keep the latest getToken in a ref so the load effect can run once without
  // re-subscribing every time Clerk hands back a new function identity.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const savePending = useCallback((pending: SavedPending | null) => {
    pendingRef.current = pending;
    setPendingCount(pending?.updates.length ?? 0);
    saveJSON(PENDING_KEY, pending);
  }, []);

  const saveReminder = useCallback((reminder: SavedReminder | null) => {
    reminderRef.current = reminder;
    saveJSON(REMINDER_KEY, reminder);
  }, []);

  // Refresh without replacing valid on-screen data during a temporary outage.
  // A successful `{ challenge: null }` is different: it means the participant
  // no longer has an active challenge and the card should be removed.
  const refreshLive = useCallback(async (): Promise<boolean> => {
    if (!isSignedIn) return false;
    try {
      const token = await getTokenRef.current();
      const { challenge: live, members: nextMembers, ok } = await fetchActiveChallenge(token);
      if (!ok) return false;
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
        reminderRef.current = await loadJSON<SavedReminder | null>(REMINDER_KEY, null);
        if (!isSignedIn) {
          if (alive) { setChallenge(DEFAULT_CHALLENGE); setMembers([]); }
          return;
        }
        await refreshLive();
      } catch {
        // best-effort: keep the locally-restored challenge on any failure
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
  const syncTask = useCallback((challengeId: string, day: number, body: PendingUpdate) => {
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
        const ok = await postChallengeProgress(challengeId, body, token);
        if (!ok) return;
        const latest = pendingRef.current;
        if (!latest || latest.id !== challengeId || latest.day !== day) return;
        const queued = latest.updates.find((item) => item.taskId === body.taskId);
        if (!queued || queued.value !== body.value || queued.done !== body.done) return;
        const remaining = latest.updates.filter((item) => item.taskId !== body.taskId);
        savePending(remaining.length ? { ...latest, updates: remaining } : null);
      })
      .catch(() => {});
  }, [savePending]);

  const flushPending = useCallback(async () => {
    if (flushingRef.current || !isSignedIn || challenge.id === DEFAULT_CHALLENGE.id) return;
    const pending = pendingRef.current;
    if (!pending) return;
    if (pending.id !== challenge.id || pending.day !== challenge.currentDay) {
      savePending(null);
      return;
    }
    flushingRef.current = true;
    try {
      const token = await getTokenRef.current();
      for (const update of [...pending.updates]) {
        const ok = await postChallengeProgress(challenge.id, update, token);
        if (!ok) break;
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
  }, [challenge.id, challenge.currentDay, isSignedIn, savePending]);

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

  // One-shot 22:00 reminder for a participant who still has any incomplete
  // task. It is scheduled locally, so iOS/Android can deliver it while the app
  // is backgrounded or terminated. Completing every task cancels it.
  useEffect(() => {
    if (loading || Platform.OS === 'web') return;
    let cancelled = false;
    const participant = challenge.id !== DEFAULT_CHALLENGE.id && members.some((member) => member.isMe);
    const incomplete = challenge.tasks.filter((task) => !taskDone(task));
    (async () => {
      const previous = reminderRef.current;
      const sameDay = previous?.id === challenge.id && previous.day === challenge.currentDay;
      if (!isSignedIn || !participant || challenge.currentDay <= 0 || challenge.eliminated || incomplete.length === 0) {
        if (previous) {
          await Notifications.cancelScheduledNotificationAsync(previous.notificationId).catch(() => {});
          if (!cancelled) saveReminder(null);
        }
        return;
      }
      if (sameDay) return;
      if (previous) {
        await Notifications.cancelScheduledNotificationAsync(previous.notificationId).catch(() => {});
        if (!cancelled) saveReminder(null);
      }
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
      if (cancelled || status !== 'granted') return;

      const now = Date.now();
      const todayAt22 = almatyTimeToday(22, 0, now);
      const todayClose = almatyTimeToday(23, 1, now);
      // If the app first loads between 22:00 and 23:01, deliver a catch-up
      // reminder immediately. After closure, prepare tomorrow's reminder.
      const reminderAt = now < todayAt22
        ? todayAt22
        : now < todayClose
          ? now + 2_000
          : todayAt22 + 24 * 60 * 60 * 1000;
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Челлендж: отметьте цели',
          body: `Не выполнено: ${incomplete.map((task) => task.title).join(', ')}. Внесите отметки до 23:00.`,
          sound: 'default',
          data: { target: { tab: 'CommunityTab', screen: 'ChallengeDetail', params: { challengeId: challenge.id } } },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(reminderAt),
          ...(Platform.OS === 'android' ? { channelId: 'challenge-reminders' } : {}),
        },
      });
      if (cancelled) {
        await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
        return;
      }
      saveReminder({ id: challenge.id, day: challenge.currentDay, notificationId, scheduledFor: new Date(reminderAt).toISOString() });
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [challenge.currentDay, challenge.eliminated, challenge.id, challenge.tasks, isSignedIn, loading, members, saveReminder]);

  const persist = useCallback((c: Challenge) => {
    const snap = toSaved(c);
    savedRef.current = snap;
    saveJSON(PROGRESS_KEY, snap);
  }, []);

  const setMetric = useCallback((taskId: string, value: number) => {
    const safe = Math.max(0, value);
    setChallenge((prev) => {
      if (isChallengeDayLocked(prev)) return prev;
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId && t.kind === 'metric' ? { ...t, current: safe } : t),
      };
      persist(next);
      syncTask(next.id, next.currentDay, { taskId, value: safe });
      return next;
    });
  }, [persist, syncTask]);

  const toggleBinary = useCallback((taskId: string) => {
    setChallenge((prev) => {
      if (isChallengeDayLocked(prev)) return prev;
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId && t.kind === 'binary' ? { ...t, done: !t.done } : t),
      };
      const updated = next.tasks.find((t) => t.id === taskId);
      const done = updated && updated.kind === 'binary' ? updated.done : undefined;
      persist(next);
      if (done !== undefined) syncTask(next.id, next.currentDay, { taskId, done });
      return next;
    });
  }, [persist, syncTask]);

  const value = useMemo<ChallengeState>(() => {
    const pointsToday = challengePointsToday(challenge.tasks);
    const bonusToday = challengeBonusToday(challenge.tasks);

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
    // Sum ALL team members (full roster from the server), not a subset.
    const teamPoints = ranked.reduce((s, m) => s + m.points, 0);
    // Team-wide discipline totals — every member sees the team's 🚩 and штрафы.
    const teamFlags = ranked.reduce((s, m) => s + totalFlags(m.flags), 0);
    const teamPenalty = ranked.reduce((s, m) => {
      const explicit = m.penalty ?? 0;
      return s + (explicit < 0 ? explicit : -100 * totalFlags(m.flags));
    }, 0);

    return {
      challenge, loading, isParticipant: challenge.id !== DEFAULT_CHALLENGE.id && members.some((m) => m.isMe),
      syncPending: pendingCount > 0,
      dayLocked: isChallengeDayLocked(challenge, timeTick),
      setMetric, toggleBinary, pointsToday, bonusToday,
      leaderboard: ranked, myRank, teamPoints, teamFlags, teamPenalty,
    };
  }, [challenge, members, loading, pendingCount, setMetric, timeTick, toggleBinary]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChallenge() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChallenge must be used within ChallengeProvider');
  return c;
}

export { taskPoints, taskBonus, taskDone };
