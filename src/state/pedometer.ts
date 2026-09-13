// Шагомер телефона.
//
// ЗАЧЕМ. До сих пор шаги в тренировке не измерялись, а вычислялись из
// пройденного расстояния: метры поделить на среднюю длину шага. Средняя длина
// шага — это средняя температура по больнице: у высокого человека и у невысокой
// женщины она отличается на четверть, и никакая настройка формулы этого не
// исправит. Garmin шаги СЧИТАЕТ — акселерометром. Ровно такой датчик есть в
// каждом телефоне: на iPhone это CoreMotion, на Android — аппаратный счётчик
// шагов. Отсюда и берём.
//
// ЧЕМ ПЛАТФОРМЫ ОТЛИЧАЮТСЯ. Это важно, потому что от этого зависит, кому
// повезёт больше:
//   iOS     — система сама ведёт историю шагов и отдаёт её за любой прошедший
//             отрезок. Работает и когда приложение свёрнуто, и когда его
//             выгрузили из памяти. Это самый честный источник.
//   Android — истории нет, есть только подписка, и события по ней приходят,
//             пока приложение на экране. Аппаратный счётчик при этом продолжает
//             тикать сам, поэтому после возвращения в приложение подписка обычно
//             отдаёт накопленное целиком. «Обычно» — потому что зависит от
//             производителя, и полагаться на это как на гарантию нельзя.
//
// Поэтому модуль возвращает `null`, когда посчитать нечем, а не ноль: ноль
// означал бы «человек не сделал ни шага», и трекер молча записал бы пустую
// тренировку. По `null` вызывающий понимает, что надо вернуться к расчёту из
// расстояния.
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

let sub: { remove: () => void } | null = null;
/** Последнее значение подписки — шаги с момента, когда её открыли. */
let watched = 0;

/**
 * Ведёт ли система историю шагов, у которой можно спросить прошедший отрезок.
 *
 * От этого зависит, переживёт ли счёт шагов выгрузку приложения из памяти: с
 * историей пропущенное восстанавливается запросом, без неё — теряется вместе с
 * процессом.
 */
export function hasHistory(): boolean {
  return Platform.OS === 'ios';
}

/** Есть ли в телефоне шагомер. */
export async function available(): Promise<boolean> {
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Спросить разрешение. На iOS это «Движение и фитнес» — отдельное от геопозиции,
 * и человек может дать одно и отказать в другом.
 */
export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Pedometer.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Pedometer.requestPermissionsAsync();
    return asked.granted;
  } catch {
    // На части Android разрешение шагомеру не требуется вовсе, и вызов падает.
    // Это не отказ — просто спрашивать не у кого.
    return Platform.OS === 'android';
  }
}

/** Открыть подписку. Нужна для живого счётчика на экране и как запасной путь. */
export function startWatching(): void {
  if (sub) return;
  watched = 0;
  try {
    sub = Pedometer.watchStepCount((r) => {
      // Значение приходит накопительным с момента подписки, а не приращением.
      if (typeof r?.steps === 'number' && Number.isFinite(r.steps)) watched = r.steps;
    });
  } catch {
    sub = null;
  }
}

export function stopWatching(): void {
  try { sub?.remove(); } catch { /* уже снята */ }
  sub = null;
}

/** Сколько шагов насчитала подписка с момента открытия. */
export function watchedSteps(): number {
  return watched;
}

/**
 * Шаги за отрезок из системной истории. Только iOS; на остальных — `null`.
 *
 * Не считаем «нет истории» ошибкой: это штатное состояние Android, а не сбой.
 */
export async function stepsBetween(fromMs: number, toMs: number): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  if (!(toMs > fromMs)) return 0;
  try {
    const r = await Pedometer.getStepCountAsync(new Date(fromMs), new Date(toMs));
    const n = r?.steps;
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  } catch {
    return null;
  }
}

/**
 * Шаги за отрезок: сначала системная история, если её нет — подписка.
 *
 * Порядок именно такой. История точнее, потому что включает время, пока
 * приложение было свёрнуто, — а бегают именно так, с телефоном в кармане.
 */
export async function segmentSteps(fromMs: number, toMs: number): Promise<number | null> {
  const fromHistory = await stepsBetween(fromMs, toMs);
  if (fromHistory !== null) return fromHistory;
  return sub ? watched : null;
}
