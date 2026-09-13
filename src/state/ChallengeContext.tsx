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
  averagePerPastDay, DEFAULT_REPORT_DEADLINE_HOUR,
} from '../data/community';
import { expectedChallengeDay, isChallengeDayLocked } from '../data/challengeDay';
import { applyPending, type PendingUpdate, type SavedPending } from './challengeMerge';

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
/** Пауза перед первым повтором неотправленной отметки. Дальше удваивается. */
const BASE_RETRY_MS = 20_000;
/** Потолок паузы: пять минут. Дольше ждать бессмысленно — день не резиновый. */
const MAX_RETRY_MS = 5 * 60_000;
const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000;

interface SavedProgress {
  id: string;
  day: number;
  tasks: { id: string; current?: number; done?: boolean }[];
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
//
// Применяется ТОЛЬКО к заглушке до первого ответа сервера: там показывать
// нечего, кроме последнего виденного. К живым данным — никогда, см. applyPending.
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
        const next = applyPending(live, pendingRef.current);
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

  // Снимок дня на устройстве: экран должен пережить перезапуск приложения.
  // Объявлен здесь, а не ниже рядом с setMetric, потому что нужен отправке.
  const persist = useCallback((c: Challenge) => {
    const snap = toSaved(c);
    savedRef.current = snap;
    saveJSON(PROGRESS_KEY, snap);
  }, []);

  // Приводим экран к тому, что реально записал сервер. Нужно, когда отметку
  // обогнал другой запрос: локальный снимок дня иначе так и показывал бы
  // несохранённое значение до конца дня.
  const adoptServerValue = useCallback((taskId: string, value?: number, done?: boolean) => {
    if (value === undefined && done === undefined) return;
    setChallenge((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task) return prev;
      const same = task.kind === 'metric'
        ? value === undefined || task.current === value
        : done === undefined || task.done === done;
      if (same) return prev;
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          if (t.kind === 'metric' && value !== undefined) return { ...t, current: value };
          if (t.kind === 'binary' && done !== undefined) return { ...t, done };
          return t;
        }),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  // ─── Отправка отметок ───────────────────────────────────────────────────────
  // Правило: по одной задаче в любой момент времени в воздухе НЕ БОЛЕЕ ОДНОГО
  // запроса.
  //
  // Раньше запрос уходил на каждое изменение: нажал «+1» пять раз — ушло пять
  // запросов. Записывался пришедший последним, а не нажатый последним, и у
  // человека, отметившего 25 страниц, в зачёт попадало 12. Повторы из очереди
  // добавляли к этому ещё и старые значения.
  //
  // Теперь очередь — единственный источник правды о том, что надо отправить, а
  // `inFlightRef` не даёт запустить второй запрос по той же задаче. Пока он
  // летит, новые нажатия просто обновляют значение в очереди; после ответа
  // отправляется актуальное, если оно успело измениться.
  const inFlightRef = useRef<Set<string>>(new Set());

  // ── Пауза между повторами ──────────────────────────────────────────────────
  //
  // Очередь повторялась ровно каждые двадцать секунд, чем бы ни закончилась
  // прошлая попытка. Одиннадцатого сентября это обернулось против нас: сервер
  // перестал отвечать в 22:00, и сто шестьдесят приложений начали долбить его
  // втрое чаще обычного — сбой сам себя кормил.
  //
  // Теперь после каждой неудачи пауза удваивается, а к ней добавляется случайная
  // добавка. Разброс здесь важнее самой паузы: упали все одновременно, и без
  // него все одновременно и вернулись бы — тем же залпом, от которого сервер
  // лёг.
  const failStreakRef = useRef(0);
  const retryAfterRef = useRef(0);

  const noteSendResult = useCallback((ok: boolean) => {
    if (ok) {
      failStreakRef.current = 0;
      retryAfterRef.current = 0;
      return;
    }
    failStreakRef.current = Math.min(failStreakRef.current + 1, 5);
    const base = Math.min(BASE_RETRY_MS * 2 ** (failStreakRef.current - 1), MAX_RETRY_MS);
    retryAfterRef.current = Date.now() + base + Math.random() * base;
  }, []);

  const sendTask = useCallback(async (challengeId: string, day: number, taskId: string, rollback?: () => void) => {
    if (inFlightRef.current.has(taskId)) return; // уже летит — догонит следующим кругом
    inFlightRef.current.add(taskId);
    try {
      // Цикл: отправили — проверили, не изменилось ли значение за это время.
      for (;;) {
        const queue = pendingRef.current;
        if (!queue || queue.id !== challengeId || queue.day !== day) return;
        const update = queue.updates.find((item) => item.taskId === taskId);
        if (!update) return; // уже подтверждено

        const token = await getTokenRef.current();
        const res = await postChallengeProgress(challengeId, update, token);

        if (!res.ok) {
          if (res.reason === 'deadline_passed') {
            // День закрыт — оптимистичную запись откатываем, иначе на экране
            // «сохранено», а сервер этой отметки не знает.
            dropPending(challengeId, day, taskId);
            rollback?.();
            warnDeadlinePassed(challengeId, day, res.deadlineHour);
          } else if (res.reason === 'left' || res.reason === 'forbidden' || res.reason === 'challenge_not_active') {
            // Окончательные отказы: человек вышел по белому флагу 🏳️, не
            // участник или челлендж закончился. Повторять такой запрос по
            // таймеру бессмысленно — он будет отклонён ровно так же, а очередь
            // никогда не опустеет. Снимаем и откатываем без предупреждения:
            // причину экран уже показывает баннером.
            dropPending(challengeId, day, taskId);
            rollback?.();
          }
          // Отказ по существу — не повод отступать: сервер жив и ответил.
          // Откат нужен только при сбое связи или пятисотке.
          noteSendResult(res.status >= 400 && res.status < 500);
          return; // сеть/сервер — оставляем в очереди, повторим позже
        }
        noteSendResult(true);

        // Сервер мог записать не то, что мы прислали: обрезать по потолку или
        // отбросить нашу запись как опоздавшую. Приводим экран к его правде.
        adoptServerValue(taskId, res.savedValue, res.savedDone);

        const after = pendingRef.current;
        if (!after || after.id !== challengeId || after.day !== day) return;
        const still = after.updates.find((item) => item.taskId === taskId);
        // Значение не менялось, пока запрос летел, — снимаем из очереди.
        if (!still || (still.value === update.value && still.done === update.done)) {
          const remaining = after.updates.filter((item) => item.taskId !== taskId);
          savePending(remaining.length ? { ...after, updates: remaining } : null);
          return;
        }
        // Изменилось — идём на второй круг и отправляем актуальное.
      }
    } catch {
      // Оставляем в очереди: повтор произойдёт по таймеру, с паузой.
      noteSendResult(false);
    } finally {
      inFlightRef.current.delete(taskId);
    }
  }, [adoptServerValue, dropPending, noteSendResult, savePending, warnDeadlinePassed]);

  // Каждое нажатие сохраняется локально и кладётся в очередь, и только потом
  // уходит в сеть. Неотправленное остаётся в очереди и повторяется, пока
  // приложение открыто, — отдельного «отчёта за день» человеку слать не нужно.
  const syncTask = useCallback((challengeId: string, day: number, body: PendingUpdate, rollback?: () => void) => {
    if (!challengeId || challengeId === DEFAULT_CHALLENGE.id) return;
    const previous = pendingRef.current;
    const updates = previous?.id === challengeId && previous.day === day ? previous.updates : [];
    savePending({
      id: challengeId,
      day,
      updates: [...updates.filter((item) => item.taskId !== body.taskId), body],
    });
    void sendTask(challengeId, day, body.taskId, rollback);
  }, [savePending, sendTask]);

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
    // Ещё не отстоялись после прошлой неудачи — этот заход пропускаем.
    // Нажатие человека сюда не попадает: оно уходит своим путём, минуя очередь.
    if (Date.now() < retryAfterRef.current) return;
    flushingRef.current = true;
    try {
      // Берём только СПИСОК ЗАДАЧ, а не их значения: значение `sendTask`
      // прочитает из очереди в момент отправки. Раньше здесь шёл снимок
      // очереди, сделанный до начала цикла, — и если человек правил число,
      // пока повтор летел, на сервер уходило устаревшее.
      const taskIds = pending.updates.map((u) => u.taskId);
      // Последовательно, а не Promise.all: параллельные запросы по разным
      // задачам сервер выдержит, но при слабой связи они мешают друг другу.
      for (const taskId of taskIds) {
        await sendTask(challenge.id, challenge.currentDay, taskId);
      }
    } finally {
      flushingRef.current = false;
    }
  }, [challenge.id, challenge.currentDay, isSignedIn, sendTask]);

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
