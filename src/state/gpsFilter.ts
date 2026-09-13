// Отсев мусорных GPS-точек при записи тренировки.
//
// ЗАЧЕМ. Спутниковая координата — не точка, а облако: телефон отдаёт вместе с
// ней радиус, внутри которого он «где-то есть». В городе этот радиус — десятки
// метров, и пока человек стоит на светофоре, соседние замеры пляшут внутри
// облака на пять-десять метров. Если складывать все эти скачки, накапливается
// дистанция, которой не было: человек стоял, а счётчик рос. Отсюда и берётся
// «у нас показывает больше, чем Garmin».
//
// Раньше отсечка была одна: шаг короче двух метров не считаем. Двух метров
// мало — при радиусе в двадцать метров дрожание легко даёт пять, и оно
// проходило фильтр как настоящий шаг.
//
// Здесь три правила вместо одного. Модуль намеренно чистый (без обращений к
// системе), чтобы поведение можно было проверить тестами на записанных
// сценариях, а не «на улице на глаз».

export interface Coord { latitude: number; longitude: number }

/** Замер от системы: координата плюс всё, что помогает понять, верить ли ей. */
export interface Fix {
  latitude: number;
  longitude: number;
  /** Радиус погрешности по горизонтали, метры. */
  accuracy?: number | null;
  altitude?: number | null;
  /** Погрешность высоты, метры. */
  altitudeAccuracy?: number | null;
  /** Время замера, мс. Именно замера, а не доставки в приложение. */
  timestamp: number;
}

/** Накопленное состояние трека — всё, что нужно, чтобы судить о новой точке. */
export interface Track {
  coords: Coord[];
  distanceM: number;
  elevationGainM: number;
  lastAltitude: number | null;
  /** Время последней ПРИНЯТОЙ точки, мс. 0 — точек ещё не было. */
  lastAt: number;
  /** Радиус погрешности последней принятой точки, метры. */
  lastAccuracy: number;
  /**
   * Время В ДВИЖЕНИИ, мс — без остановок на светофорах и передышек.
   *
   * Часы (Garmin, Strava) считают темп именно по нему, а не по секундомеру.
   * Если делить дистанцию на общее время, каждая минута у светофора делает
   * темп медленнее, и человек, сверившись с часами, видит другое число.
   */
  movingMs: number;
}

export const EMPTY_TRACK: Track = {
  coords: [], distanceM: 0, elevationGainM: 0,
  lastAltitude: null, lastAt: 0, lastAccuracy: 0, movingMs: 0,
};

/**
 * Медленнее этого — стоим. 0,4 м/с — это 1,4 км/ч, вдвое медленнее самой
 * неспешной прогулки, так что настоящая ходьба под порог не попадает.
 *
 * Считается по принятым точкам: пока человек стоит, фильтр шума не принимает
 * ни одной, и между двумя принятыми точками копится долгий промежуток с
 * маленьким сдвигом. Такой промежуток в движение не идёт.
 */
export const MOVING_MIN_SPEED_MS = 0.4;

// ───────── Пороги ─────────

/**
 * Хуже этого замеру верить нельзя вообще. Пятьдесят метров — это уже не
 * «примерно здесь», а «где-то в этом квартале»: такая точка и якорь сдвинет, и
 * дистанцию раздует.
 *
 * Порог намеренно не строгий. Сделать его жёстче (скажем, 20 м) заманчиво, но
 * тогда в плотной застройке и под деревьями трек просто перестанет писаться, а
 * человек увидит ноль и решит, что приложение сломано. Основную работу делает
 * не этот порог, а следующий.
 */
export const MAX_ACCURACY_M = 50;

/**
 * Насколько смещение должно превышать собственный шум замера, чтобы считаться
 * движением. Радиус двадцать метров — сдвиг меньше десяти ничего не доказывает.
 *
 * Это и есть главное отличие от прежней логики: порог не постоянный, а растёт
 * вместе с погрешностью. Когда сигнал хороший, фильтр почти не мешает; когда
 * плохой — не даёт дрожанию превратиться в километры.
 */
export const NOISE_FACTOR = 0.5;

/** Ниже этого не опускаемся даже при идеальном сигнале. */
export const MIN_MOVE_M = 3;

/** Выше этого порог не поднимаем: иначе на плохом сигнале потеряется и реальный бег. */
export const MAX_MOVE_GATE_M = 25;

/**
 * Предел правдоподобной скорости, м/с. Всё быстрее — не человек, а прыжок
 * координаты: спутник на секунду «перекинул» точку через квартал и вернул
 * обратно. Такой выброс без проверки добавляет двойное расстояние до него и
 * назад.
 *
 * Ходьба: 4,5 м/с — это 16 км/ч, быстрее любого пешехода, но медленнее машины.
 * Бег: 9 м/с — быстрее спринтера на дистанции, но заведомо медленнее велосипеда
 * под горку.
 */
export const MAX_SPEED_MS: Record<'walk' | 'run', number> = { walk: 4.5, run: 9 };

/** Если система не сообщила погрешность, считаем сигнал средним, а не идеальным. */
export const ASSUMED_ACCURACY_M = 15;

/**
 * Порог набора высоты. GPS-высота шумит сильнее координат — на ровном месте
 * легко даёт ±5 м. Прежние 3 м этот шум пропускали, и ровная пробежка «набирала»
 * несколько десятков метров подъёма.
 */
export const ELEVATION_STEP_M = 5;

/** Хуже этого высоте не верим совсем. */
export const MAX_ALTITUDE_ACCURACY_M = 20;

// ───────── Расчёты ─────────

/** Расстояние между двумя точками по формуле гаверсинуса, в метрах. */
export function haversineM(a: Coord, b: Coord): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Почему точка не принята — пригодится и в тестах, и при разборе жалоб. */
export type RejectReason =
  | 'invalid'      // нечисловые координаты
  | 'inaccurate'   // радиус погрешности за пределом доверия
  | 'noise'        // сдвиг не больше собственного шума замера
  | 'backwards'    // время идёт назад или совпадает
  | 'teleport';    // подразумеваемая скорость невозможна для человека

export interface ApplyResult {
  track: Track;
  accepted: boolean;
  reason?: RejectReason;
  /** Сколько метров добавил этот замер. */
  addedM: number;
}

/**
 * Приложить один замер к треку.
 *
 * Отклонённая точка НЕ сдвигает якорь: следующий замер сравнивается всё с той
 * же последней принятой точкой. Это важно — иначе порог «не меньше пяти метров»
 * съедал бы медленную ходьбу, отбрасывая каждый шаг по отдельности. А так шаги
 * копятся, и как только человек реально ушёл на пять метров, точка принимается
 * целиком. Фильтр огрубляет трек, но не теряет пройденное.
 */
export function applyFix(track: Track, fix: Fix, type: 'walk' | 'run'): ApplyResult {
  const nope = (reason: RejectReason): ApplyResult => ({ track, accepted: false, reason, addedM: 0 });

  if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return nope('invalid');

  const acc = typeof fix.accuracy === 'number' && Number.isFinite(fix.accuracy) && fix.accuracy > 0
    ? fix.accuracy
    : ASSUMED_ACCURACY_M;
  if (acc > MAX_ACCURACY_M) return nope('inaccurate');

  const point: Coord = { latitude: fix.latitude, longitude: fix.longitude };
  const last = track.coords[track.coords.length - 1];

  // Первая точка задаёт якорь и не даёт дистанции. Проверку точности она уже
  // прошла — на плохом замере якорь не ставим, иначе весь трек поедет от
  // неверного начала.
  if (!last) {
    return {
      track: {
        ...track,
        coords: [point],
        lastAt: fix.timestamp,
        lastAccuracy: acc,
        lastAltitude: readAltitude(fix),
      },
      accepted: true,
      addedM: 0,
    };
  }

  const dt = (fix.timestamp - track.lastAt) / 1000;
  if (!(dt > 0)) return nope('backwards');

  const d = haversineM(last, point);

  // Порог движения — от шума ХУДШЕГО из двух замеров: если предыдущая точка
  // была неточной, разница между ними тоже недостоверна.
  const noise = Math.max(acc, track.lastAccuracy) * NOISE_FACTOR;
  const gate = Math.min(MAX_MOVE_GATE_M, Math.max(MIN_MOVE_M, noise));
  if (d < gate) return nope('noise');

  if (d / dt > MAX_SPEED_MS[type]) return nope('teleport');

  // Набор высоты — только явные подъёмы и только когда высоте можно верить.
  let gain = track.elevationGainM;
  let lastAlt = track.lastAltitude;
  const alt = readAltitude(fix);
  if (alt !== null) {
    if (lastAlt !== null && alt - lastAlt >= ELEVATION_STEP_M) gain += alt - lastAlt;
    if (lastAlt === null || Math.abs(alt - lastAlt) >= ELEVATION_STEP_M) lastAlt = alt;
  }

  // Промежуток от прошлой принятой точки считается движением, только если за
  // него реально прошли: стояние у светофора со сдвигом в пару метров за две
  // минуты — не движение, даже когда точка в итоге принята.
  const moving = d / dt >= MOVING_MIN_SPEED_MS;

  return {
    track: {
      coords: [...track.coords, point],
      distanceM: track.distanceM + d,
      elevationGainM: gain,
      lastAltitude: lastAlt,
      lastAt: fix.timestamp,
      lastAccuracy: acc,
      movingMs: track.movingMs + (moving ? dt * 1000 : 0),
    },
    accepted: true,
    addedM: d,
  };
}

function readAltitude(fix: Fix): number | null {
  const alt = fix.altitude;
  if (typeof alt !== 'number' || !Number.isFinite(alt)) return null;
  const aacc = fix.altitudeAccuracy;
  if (typeof aacc === 'number' && Number.isFinite(aacc) && aacc > MAX_ALTITUDE_ACCURACY_M) return null;
  return alt;
}

/** Приложить пачку замеров подряд. Система часто доставляет их группой. */
export function applyFixes(track: Track, fixes: Fix[], type: 'walk' | 'run'): Track {
  // По времени: система может отдать пачку не по порядку, а проверки скорости и
  // «время назад» на перепутанном порядке отбросили бы годные точки.
  const sorted = [...fixes].sort((a, b) => a.timestamp - b.timestamp);
  let t = track;
  for (const f of sorted) t = applyFix(t, f, type).track;
  return t;
}
