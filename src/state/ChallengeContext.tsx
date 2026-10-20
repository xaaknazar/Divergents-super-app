// Tracks the live daily challenge: metric inputs (steps, pages) and the binary
// "no sugar" toggle. Today's points (incl. over-goal bonus) roll up into the
// team leaderboard so the user's rank updates live. The active challenge and
// its full team are loaded from the website API; the user's daily inputs are
// persisted on-device so progress survives app launches.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';
import { loadJSON, readJSON, saveJSON } from './persist';
import { randomUUID } from 'expo-crypto';
import { ProgressOutbox, mergeProgressOutbox, type ProgressOutboxState } from './progressOutbox';
import {
  DEFAULT_CHALLENGE, Challenge, Member, fetchActiveChallenges, postChallengeProgress,
  challengePointsToday, challengeBonusToday, taskPoints, taskBonus, taskDone, totalFlags,
  averagePerPastDay, sumMemberPenalties,
} from '../data/community';
import { isChallengeDayLocked, marksClosed } from '../data/challengeDay';


export interface RankedMember extends Member { rank: number; points: number }

interface ChallengeState {
  challenge: Challenge;
  /** All approved running memberships, used by the community cards. */
  activeChallenges?: Challenge[];
  byId?: Record<string, ChallengeState>;
  loading: boolean;
  /** Последняя загрузка активного челленджа с сервера не удалась. */
  error: boolean;
  isParticipant: boolean;
  syncPending: boolean;
  syncError: string | null;
  dayLocked: boolean;
  /**
   * Отметку сейчас примут. Учитывает и закрытый день, и вылет, и выход по
   * белому флагу 🏳️ — экранам вне челленджа незачем знать про три причины
   * отдельно, им нужно решить одно: предлагать человеку отметиться или нет.
   */
  canMark: boolean;
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
// Allows isolated component previews without mounting network-backed providers.
export { Ctx as ChallengeStateContext };

const PENDING_KEY = 'dvg.challengeProgressOutbox.v2';
const REMINDER_KEY = 'dvg.challengeReminder.v1';
const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000;
type Snapshot = { challenge: Challenge; members: Member[] };
interface SavedReminder { notificationId: string }

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

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, userId } = useAuth();
  const [data, setData] = useState<{ ownerId: string | null | undefined; snapshots: Snapshot[] }>({ ownerId: userId, snapshots: [] });
  const snapshots = data.ownerId === userId ? data.snapshots : [];
  const snapshotRef = useRef(snapshots); snapshotRef.current = snapshots;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [outbox, setOutbox] = useState<ProgressOutboxState | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [timeTick, setTimeTick] = useState(() => Date.now());
  const engineRef = useRef<ProgressOutbox | null>(null);
  const ownerRef = useRef(userId); ownerRef.current = userId;
  const getTokenRef = useRef(getToken); getTokenRef.current = getToken;
  const revision = useRef(0);
  const scopeKey = snapshots.map(s => s.challenge.id + ':' + s.challenge.currentDay).join('|');
  const flushPending = useCallback(async () => { await engineRef.current?.flush(); }, []);

  const refreshLive = useCallback(async (): Promise<boolean> => {
    if (!isSignedIn || !userId) return false;
    const owner = userId;
    const request = ++revision.current;
    try {
      const token = await getTokenRef.current();
      const result = await fetchActiveChallenges(token);
      if (ownerRef.current !== owner || request !== revision.current) return false;
      if (!result.ok) { setError(true); return false; }
      setError(false);
      {
        const next = result.challenges.flatMap(view => {
          if (!view.challenge || !view.members.some(member => member.isMe)) return [];
          const challenge = mergeProgressOutbox(view.challenge, engineRef.current?.state ?? null);
          const prior = snapshotRef.current.find(s => s.challenge.id === challenge.id)?.challenge;
          if (prior?.currentDay === challenge.currentDay) {
            challenge.tasks = challenge.tasks.map(task => {
              const old = prior.tasks.find(t => t.id === task.id);
              return old && (old.version ?? 0) > (task.version ?? 0) ? old : task;
            });
          }
          return [{ challenge, members: view.members }];
        });
        // Fence closed-day callbacks immediately, not only after React commits.
        snapshotRef.current = next;
        setData({ ownerId: owner, snapshots: next });
      }
      return true;
    } catch {
      if (ownerRef.current === owner && request === revision.current) setError(true);
      return false;
    }
  }, [isSignedIn, userId]);

  useEffect(() => {
    let alive = true;
    ++revision.current;
    snapshotRef.current = [];
    setData({ ownerId: userId, snapshots: [] });
    setLoading(true); setError(false); setOutbox(null); setStorageError(false);
    (async () => {
      try {
        engineRef.current?.dispose(); engineRef.current = null;
        if (!isSignedIn || !userId) return;
        const restored = await readJSON<ProgressOutboxState | null>(PENDING_KEY, null);
        if (!alive || ownerRef.current !== userId) return;
        if (!restored.ok) { setStorageError(true); setError(true); return; }
        const owner = userId;
        const engine = new ProgressOutbox(owner, restored.value, {
          uuid: randomUUID,
          save: state => saveJSON(PENDING_KEY, state, { strict: true }),
          send: async operation => {
            if (ownerRef.current !== owner) return { ok: false, status: 401 };
            const token = await getTokenRef.current();
            if (ownerRef.current !== owner) return { ok: false, status: 401 };
            return postChallengeProgress(operation.challengeId, operation, token);
          },
          changed: (state, issue) => {
            if (!alive || ownerRef.current !== owner) return;
            setOutbox({ ...state }); setStorageError(issue === 'storage');
            const next = snapshotRef.current.map(s => ({ ...s, challenge: mergeProgressOutbox(s.challenge, state) }));
            snapshotRef.current = next;
            setData({ ownerId: owner, snapshots: next });
          },
        });
        engineRef.current = engine; setOutbox({ ...engine.state });
        const legacy = await loadJSON<{ updates?: unknown[] } | null>('dvg.challengeProgressPending.v1', null);
        if (alive && ownerRef.current === owner && legacy?.updates?.length) {
          Alert.alert('Проверьте старые отметки', 'Есть неподтверждённые отметки из прошлой версии. Проверьте результат на сервере; старые значения не будут отправлены автоматически.');
        }
        if (alive && ownerRef.current === owner) await refreshLive();
      } catch { if (alive) setError(true); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; ++revision.current; engineRef.current?.dispose(); engineRef.current = null; };
  }, [isSignedIn, userId, refreshLive]);

  useEffect(() => {
    if (loading || !isSignedIn) return;
    void flushPending();
    const timer = setInterval(flushPending, 20_000);
    return () => clearInterval(timer);
  }, [flushPending, isSignedIn, loading]);

  useEffect(() => {
    if (!isSignedIn) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') flushPending().finally(() => refreshLive());
    });
    const push = Notifications.addNotificationReceivedListener(() => { void refreshLive(); });
    return () => { sub.remove(); push.remove(); };
  }, [flushPending, isSignedIn, refreshLive]);

  useEffect(() => {
    if (loading || !isSignedIn) return;
    const tick = setInterval(() => setTimeTick(Date.now()), 15_000);
    const refresh = setInterval(refreshLive, 5 * 60_000);
    const now = Date.now();
    const rolloverAt = nextAlmatyTime(23, 1, now);
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (rolloverAt - 10_000 > now) timers.push(setTimeout(() => { void flushPending(); }, rolloverAt - 10_000 - now));
    for (const delay of [5_000, 30_000, 60_000, 120_000, 300_000]) {
      timers.push(setTimeout(() => { flushPending().finally(() => refreshLive()); }, Math.max(0, rolloverAt + delay - now)));
    }
    return () => { clearInterval(tick); clearInterval(refresh); timers.forEach(clearTimeout); };
  }, [loading, isSignedIn, scopeKey, flushPending, refreshLive]);

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

  const enqueue = useCallback((owner: typeof userId, challengeId: string, day: number, taskId: string, value?: number) => {
    if (!owner || ownerRef.current !== owner) return;
    const current = snapshotRef.current.find(s => s.challenge.id === challengeId)?.challenge;
    // A stale dialog callback cannot write to a different challenge or a new day.
    if (!current || current.currentDay !== day || marksClosed(current) || !engineRef.current) return;
    const task = current.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.kind === 'metric') {
      if (value === undefined || !Number.isFinite(value)) return;
      engineRef.current.enqueue({ challengeId, day, taskId, value: Math.max(0, Math.round(value)), expectedVersion: task.version ?? 0 });
    } else if (value === undefined) {
      engineRef.current.enqueue({ challengeId, day, taskId, done: !task.done, expectedVersion: task.version ?? 0 });
    }
  }, []);

  const value = useMemo<ChallengeState>(() => {
    const makeState = ({ challenge, members }: Snapshot): ChallengeState => {
    const me = members.find((m) => m.isMe) ?? null;
    const myEliminated = me?.eliminated === true || challenge.eliminated === true || me?.left === true || challenge.whiteFlag?.left === true;
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
        const dayPoints = m.isMe && !myEliminated ? pointsToday : m.day;
        const points = m.weekBase + dayPoints;
        const todayTasks = m.isMe && !myEliminated
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
        // Средний темп — по ЗАКРЫТЫМ дням: weekBase уже не включает сегодня, и
        // делится он на прошедшие дни. Поэтому отметки за сегодня его не
        // трогают — в отличие от очков, которые обновляются на лету.
        averagePoints: averagePerPastDay(m.weekBase, challenge.currentDay, m.frozenDay ?? null),
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
    const teamPenalty = sumMemberPenalties(ranked);


      const scopedOperations = outbox && outbox.ownerId === userId ? outbox.operations.filter(o => o.challengeId === challenge.id) : [];
      return {
        challenge, loading, error, isParticipant: challenge.id !== DEFAULT_CHALLENGE.id && members.some(m => m.isMe),
        syncPending: scopedOperations.some(o => !o.blocked),
        syncError: storageError ? 'storage' : engineRef.current?.issueFor(challenge.id) ?? null,
        dayLocked: isChallengeDayLocked(challenge, timeTick),
        canMark: challenge.id !== DEFAULT_CHALLENGE.id && !marksClosed(challenge, timeTick),
        setMetric: (taskId, amount) => enqueue(userId, challenge.id, challenge.currentDay, taskId, amount),
        toggleBinary: taskId => enqueue(userId, challenge.id, challenge.currentDay, taskId),
        pointsToday, bonusToday, leaderboard: ranked, myRank, teamPoints, teamFlags, teamPenalty,
        refresh: refreshLive,
      };
    };
    const byId = Object.fromEntries(snapshots.map(snapshot => [snapshot.challenge.id, makeState(snapshot)]));
    const fallback = makeState({ challenge: DEFAULT_CHALLENGE, members: [] });
    return { ...(snapshots[0] ? byId[snapshots[0].challenge.id] : fallback),
      activeChallenges: snapshots.map(s => s.challenge), byId };
  }, [snapshots, loading, error, outbox, storageError, timeTick, userId, enqueue, refreshLive]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChallenge(challengeId?: string) {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChallenge must be used within ChallengeProvider');
  if (!challengeId || challengeId === c.challenge.id) return c;
  if (c.byId?.[challengeId]) return c.byId[challengeId];
  // An unknown/non-member route never borrows the default participant's tracker.
  return { ...c, challenge: DEFAULT_CHALLENGE, isParticipant: false, canMark: false,
    leaderboard: [], pointsToday: 0, bonusToday: 0, myRank: 0, teamPoints: 0, teamFlags: 0, teamPenalty: 0,
    syncPending: false, syncError: null, setMetric: () => {}, toggleBinary: () => {} };
}

export { taskPoints, taskBonus, taskDone };
