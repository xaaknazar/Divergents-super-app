// Фоновая запись пробежки и ходьбы.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Раньше маршрут писался через watchPositionAsync прямо
// в экране: свернул приложение или заблокировал телефон — подписка умирала
// вместе с экраном, и запись останавливалась. А бегают именно так: телефон в
// кармане, экран погашен.
//
// Система доставляет координаты в фоне не в компонент, а в ЗАДАЧУ, объявленную
// заранее и глобально. Поэтому здесь два слоя:
//   1. задача, которую регистрирует система и вызывает даже при закрытом экране;
//   2. хранилище маршрута, из которого экран читает то, что успело накопиться.
//
// Хранилище — модульное, не React-состояние: задача выполняется вне дерева
// компонентов и до React достучаться не может.
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { loadJSON, saveJSON } from './persist';
import { applyFixes, haversineM, type Fix, type Track } from './gpsFilter';
import * as pedometer from './pedometer';

export const WORKOUT_TASK = 'divergents-workout-location';
const KEY = 'dvg.workoutSession';

export interface WorkoutCoord { latitude: number; longitude: number }

export interface WorkoutSession {
  /** Идёт запись прямо сейчас (в том числе в фоне). */
  active: boolean;
  /** Пауза: подписка снята, но маршрут сохранён. */
  paused: boolean;
  type: 'run' | 'walk';
  coords: WorkoutCoord[];
  distanceM: number;
  /** Набор высоты: сумма всех подъёмов, метры. */
  elevationGainM: number;
  /** Последняя известная высота — от неё считается следующий подъём. */
  lastAltitude: number | null;
  /** Момент старта, мс. Нужен, чтобы посчитать время после возврата в приложение. */
  startedAt: number;
  /** Сколько секунд уже накоплено до текущего отрезка (сумма до пауз). */
  elapsedBefore: number;
  /** Начало текущего отрезка, мс. 0 — на паузе. */
  segmentStartedAt: number;
  /** Время последнего принятого замера, мс. Нужно для проверки скорости. */
  lastAt: number;
  /** Радиус погрешности последнего принятого замера, метры. */
  lastAccuracy: number;
  /** Время в движении, мс — без остановок. По нему считается темп. */
  movingMs: number;
  /** Сколько замеров фильтр отбросил — видно в отладке и в разборе жалоб. */
  rejected: number;
  /** Реальные шаги от шагомера телефона за эту тренировку. null — датчика нет. */
  steps: number | null;
  /**
   * Шаги закрытых отрезков (до пауз) и начало текущего, мс.
   *
   * Лежат В СЕССИИ, а не рядом в модуле, именно потому, что сессия пишется на
   * диск. Система может выгрузить приложение посреди пробежки и поднять заново
   * ради одной координаты; модульные переменные при этом обнулятся, и на финише
   * счёт шагов оказался бы нулевым.
   */
  stepsBefore: number;
  stepsFrom: number;
}

const EMPTY: WorkoutSession = {
  active: false, paused: false, type: 'run', coords: [],
  distanceM: 0, elevationGainM: 0, lastAltitude: null,
  startedAt: 0, elapsedBefore: 0, segmentStartedAt: 0,
  lastAt: 0, lastAccuracy: 0, movingMs: 0, rejected: 0,
  steps: null, stepsBefore: 0, stepsFrom: 0,
};

let session: WorkoutSession = { ...EMPTY };
let loaded = false;
/** Шагомер в этом процессе уже подключён к текущей записи. См. restore(). */
let stepsWired = false;
/** Когда в последний раз опрашивали шагомер — чтобы не дёргать его ежесекундно. */
let stepsCheckedAt = 0;
const listeners = new Set<(s: WorkoutSession) => void>();

/**
 * Шаги текущего отрезка. `null` — считать нечем.
 *
 * Отрезки устроены так же, как время: пауза закрывает текущий, возобновление
 * открывает новый. Иначе шаги, сделанные во время паузы, попали бы в
 * тренировку.
 */
async function currentSegmentSteps(): Promise<number | null> {
  if (session.stepsFrom === 0) return null;
  return pedometer.segmentSteps(session.stepsFrom, Date.now());
}

function emit() {
  const snapshot = session;
  listeners.forEach((fn) => fn(snapshot));
}

function persist() {
  // Пишем на диск, чтобы запись пережила выгрузку приложения из памяти:
  // система может убить процесс и поднять его заново ради одной координаты.
  saveJSON(KEY, session);
}

/** Расстояние между двумя точками по формуле гаверсинуса, в метрах. */
export const distanceM = haversineM;

/** Срез трека внутри сессии — то, с чем работает фильтр. */
function trackOf(s: WorkoutSession): Track {
  return {
    coords: s.coords,
    distanceM: s.distanceM,
    elevationGainM: s.elevationGainM,
    lastAltitude: s.lastAltitude,
    lastAt: s.lastAt,
    lastAccuracy: s.lastAccuracy,
    movingMs: s.movingMs,
  };
}

/**
 * Добавить замеры в маршрут. Общая точка входа для фоновой задачи и экрана.
 *
 * Решение «верить или нет» вынесено в gpsFilter — там же оно и проверяется
 * тестами. Здесь остаётся только состояние сессии.
 */
function appendFixes(fixes: Fix[]) {
  if (!session.active || session.paused || fixes.length === 0) return;
  const before = session.coords.length;
  const t = applyFixes(trackOf(session), fixes, session.type);
  const accepted = t.coords.length - before;
  session = {
    ...session,
    coords: t.coords,
    distanceM: t.distanceM,
    elevationGainM: t.elevationGainM,
    lastAltitude: t.lastAltitude,
    lastAt: t.lastAt,
    lastAccuracy: t.lastAccuracy,
    movingMs: t.movingMs,
    rejected: session.rejected + (fixes.length - accepted),
  };
  persist();
  emit();
}

// ─── Задача, которую вызывает система ────────────────────────────────────────
// Объявляется на уровне модуля и ДО того, как система доставит первое событие.
// Поэтому модуль импортируется в App.tsx, а не только в экране трекера: если
// приложение подняли из фона ради координаты, экрана ещё нет, а задача уже
// должна быть зарегистрирована.
TaskManager.defineTask(WORKOUT_TASK, async ({ data, error }: any) => {
  if (error) return;
  const locations = data?.locations;
  if (!Array.isArray(locations) || locations.length === 0) return;
  // Процесс мог быть поднят заново — состояние в памяти пустое, читаем с диска.
  if (!loaded) await restore();
  appendFixes(locations.map((l: any): Fix => ({
    latitude: l?.coords?.latitude,
    longitude: l?.coords?.longitude,
    // Радиус погрешности — то, чего раньше не спрашивали вовсе. Без него
    // нельзя отличить настоящий шаг от дрожания координаты на месте.
    accuracy: l?.coords?.accuracy,
    altitude: l?.coords?.altitude,
    altitudeAccuracy: l?.coords?.altitudeAccuracy,
    // Время ЗАМЕРА, а не доставки: система копит точки в фоне и отдаёт их
    // пачкой, так что момент прихода к скорости отношения не имеет.
    timestamp: typeof l?.timestamp === 'number' ? l.timestamp : Date.now(),
  })));
});

// ─── Публичный интерфейс для экрана ──────────────────────────────────────────

export async function restore(): Promise<WorkoutSession> {
  if (loaded) return session;
  const saved = await loadJSON<WorkoutSession | null>(KEY, null);
  if (saved && typeof saved === 'object') session = { ...EMPTY, ...saved };
  loaded = true;

  // Подъём записи после того, как систему выгрузила приложение из памяти.
  //
  // Ровно один раз за жизнь процесса. Возврат из фона тоже зовёт restore()
  // (файл мог обновить фоновая задача), но чинить подписку там нельзя: она жива,
  // её счётчик копится с самого старта, и повторное «закрытие отрезка»
  // прибавило бы одни и те же шаги второй раз.
  if (!stepsWired && session.active && !session.paused && session.steps !== null) {
    stepsWired = true;
    // Без системной истории восстановить пропущенное нечем: подписка умерла
    // вместе с процессом. Закрываем отрезок на последнем сохранённом значении и
    // открываем новый — потеряется промежуток, а не весь счёт. Молча начать с
    // нуля было бы хуже всего.
    if (!pedometer.hasHistory()) {
      session = { ...session, stepsBefore: session.steps, stepsFrom: Date.now() };
    }
    pedometer.startWatching();
  }

  emit();
  return session;
}

export function getSession(): WorkoutSession {
  return session;
}

export function subscribe(fn: (s: WorkoutSession) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/**
 * Обновить живой счётчик шагов. Экран зовёт это на своём ежесекундном тике.
 *
 * Отдельной функцией, а не таймером внутри модуля: таймер продолжал бы будить
 * систему в фоне ради числа, которое всё равно некому показать.
 */
export async function refreshSteps(): Promise<void> {
  if (!session.active || session.paused || session.steps === null) return;
  // Экран тикает раз в секунду, но шагомеру такая частота ни к чему: на iOS
  // это запрос к системной истории, и делать его шестьдесят раз в минуту ради
  // цифры, которая меняется на единицы, — зря тратить батарею.
  const now = Date.now();
  if (now - stepsCheckedAt < 4000) return;
  stepsCheckedAt = now;

  const seg = await currentSegmentSteps();
  if (seg === null) return;
  const next = session.stepsBefore + seg;
  if (next === session.steps) return;
  session = { ...session, steps: next };
  emit();
}

/** Секунды с начала записи, с учётом пауз. */
export function elapsedSec(s: WorkoutSession = session, nowMs = Date.now()): number {
  if (!s.active) return s.elapsedBefore;
  if (s.paused || s.segmentStartedAt === 0) return s.elapsedBefore;
  return s.elapsedBefore + Math.max(0, Math.round((nowMs - s.segmentStartedAt) / 1000));
}

export type StartResult = { ok: true } | { ok: false; reason: 'denied' | 'background_denied' | 'error' };

/**
 * Начать запись.
 *
 * Разрешение «всегда» (background) запрашиваем отдельно и НЕ считаем отказ
 * фатальным: без него запись всё равно идёт, просто останавливается при
 * сворачивании — как было раньше. Человеку об этом скажет экран.
 */
export async function start(type: 'run' | 'walk'): Promise<StartResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { ok: false, reason: 'denied' };

  let background = false;
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    background = bg.status === 'granted';
  } catch {
    background = false;
  }

  // Шагомер — отдельное разрешение («Движение и фитнес»), и отказ в нём тоже не
  // фатален: шаги тогда посчитаются из расстояния, как раньше.
  let counting = false;
  try {
    counting = (await pedometer.available()) && (await pedometer.ensurePermission());
  } catch {
    counting = false;
  }
  if (counting) pedometer.startWatching();

  await restore();
  const now = Date.now();
  session = {
    active: true, paused: false, type, coords: [], distanceM: 0,
    elevationGainM: 0, lastAltitude: null,
    startedAt: now, elapsedBefore: 0, segmentStartedAt: now,
    lastAt: 0, lastAccuracy: 0, movingMs: 0, rejected: 0,
    // null — «считать нечем», а не «ноль шагов». Разница принципиальная:
    // по null экран возвращается к расчёту из расстояния.
    steps: counting ? 0 : null,
    stepsBefore: 0,
    stepsFrom: counting ? now : 0,
  };
  stepsWired = true;
  stepsCheckedAt = 0;
  persist();
  emit();

  try {
    await Location.startLocationUpdatesAsync(WORKOUT_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 5,
      timeInterval: 2000,
      // Не давать системе «умно» приостанавливать обновления: на медленной
      // ходьбе iOS считает, что человек остановился, и глушит трек.
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      showsBackgroundLocationIndicator: true,
      // Android: без службы переднего плана система убивает запись через
      // несколько минут после сворачивания. Уведомление обязательно — и это
      // честно: человек видит, что приложение пишет его маршрут.
      foregroundService: {
        notificationTitle: type === 'run' ? 'Divergents · пробежка' : 'Divergents · ходьба',
        notificationBody: 'Записываем маршрут. Нажмите, чтобы открыть.',
        notificationColor: '#234088',
      },
    });
  } catch {
    session = { ...session, active: false };
    persist();
    emit();
    return { ok: false, reason: 'error' };
  }

  return background ? { ok: true } : { ok: false, reason: 'background_denied' };
}

export async function pause(): Promise<void> {
  if (!session.active || session.paused) return;
  // Закрываем шаговый отрезок до смены состояния: после паузы человек может
  // ещё походить, и эти шаги в тренировку попасть не должны.
  const seg = await currentSegmentSteps();
  pedometer.stopWatching();
  const closed = session.stepsBefore + (seg ?? 0);

  session = {
    ...session,
    paused: true,
    elapsedBefore: elapsedSec(),
    segmentStartedAt: 0,
    steps: session.steps === null ? null : closed,
    stepsBefore: closed,
    stepsFrom: 0,
  };
  persist();
  emit();
  await stopUpdates();
}

export async function resume(): Promise<void> {
  if (!session.active || !session.paused) return;
  const now = Date.now();
  if (session.steps !== null) pedometer.startWatching();
  session = {
    ...session,
    paused: false,
    segmentStartedAt: now,
    stepsFrom: session.steps === null ? 0 : now,
  };
  persist();
  emit();
  try {
    await Location.startLocationUpdatesAsync(WORKOUT_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 5,
      timeInterval: 2000,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: session.type === 'run' ? 'Divergents · пробежка' : 'Divergents · ходьба',
        notificationBody: 'Записываем маршрут. Нажмите, чтобы открыть.',
        notificationColor: '#234088',
      },
    });
  } catch { /* экран покажет, что запись не идёт */ }
}

async function stopUpdates(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(WORKOUT_TASK);
    if (running) await Location.stopLocationUpdatesAsync(WORKOUT_TASK);
  } catch { /* уже остановлено */ }
}

/** Завершить запись и вернуть итог. Хранилище очищается. */
export async function finish(): Promise<{
  coords: WorkoutCoord[]; distanceM: number; durationSec: number;
  /** Время в движении — по нему темп. Не больше общего. */
  movingSec: number;
  type: 'run' | 'walk'; elevationGainM: number;
  /** Измеренные шаги. `null` — считать было нечем, берите из расстояния. */
  steps: number | null;
}> {
  // Итоговые шаги берём здесь, а не из живого счётчика: на iOS это запрос к
  // системной истории, и он включает время, пока приложение было свёрнуто, —
  // то есть почти всю пробежку.
  let steps: number | null = null;
  if (session.steps !== null) {
    const seg = await currentSegmentSteps();
    steps = session.stepsBefore + (seg ?? 0);
  }
  pedometer.stopWatching();

  const durationSec = elapsedSec();
  const result = {
    coords: session.coords,
    distanceM: session.distanceM,
    durationSec,
    // Не больше общего: время замеров и секундомер идут по разным часам и на
    // границах могут разойтись на секунду-другую.
    movingSec: Math.min(durationSec, Math.round(session.movingMs / 1000)),
    type: session.type,
    elevationGainM: Math.round(session.elevationGainM),
    steps,
  };
  await stopUpdates();
  session = { ...EMPTY };
  stepsWired = false;
  persist();
  emit();
  return result;
}

/** Прервать без сохранения. */
export async function discard(): Promise<void> {
  pedometer.stopWatching();
  await stopUpdates();
  session = { ...EMPTY };
  stepsWired = false;
  persist();
  emit();
}

// Возврат в приложение: перечитываем с диска. Пока экран был свёрнут, точки
// добавляла фоновая задача — возможно, в другом процессе.
AppState.addEventListener('change', (state) => {
  if (state !== 'active') return;
  loaded = false;
  void restore();
});
