// Числа для показа на экране.
//
// `toLocaleString('ru-RU')` разделяет тысячи НЕРАЗРЫВНЫМ пробелом (U+00A0), а в
// новых версиях — узким неразрывным (U+202F). На iOS такая строка меряется
// Yoga по одной ширине, а рисуется по другой: строка, которая по расчёту
// помещалась, при отрисовке не влезала — и «11 240» превращалось в «11…».
// Ошибка ловилась дважды: сначала в карточке тренировки, потом в разборе дня.
// Поэтому форматирование живёт в одном месте и покрыто тестом.
//
// Обычный пробел безопасен: перенос внутри числа нам не грозит — все места, где
// оно показывается, ограничены одной строкой.

// Шрифт Gotham Rounded рисует U+00A0 шириной около 325 px — на экран его не
// выводим никогда, в том числе из дат («20 окт. 2026 г.»). Escape-последовательности
// вместо литералов: невидимый символ в regex легко потерять при правке.
const UNSAFE_SPACES = /[\u00a0\u202f]/g;

/** Заменяет неразрывные пробелы (U+00A0, U+202F) обычным. */
export function safeSpaces(s: string): string {
  return s.replace(UNSAFE_SPACES, ' ');
}

/** Целое с разделителями тысяч: 11240 → «11 240». */
export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return safeSpaces(Math.round(n).toLocaleString('ru-RU'));
}

/** Дробное с запятой: 42.25 → «42,3» (по умолчанию не больше 1 знака). */
export function fmtDecimal(n: number, maximumFractionDigits = 1, grouping = true): string {
  if (!Number.isFinite(n)) return '0';
  return safeSpaces(n.toLocaleString('ru-RU', { maximumFractionDigits, useGrouping: grouping }));
}

/** Дата без неразрывных пробелов. Неверная дата → пустая строка. */
export function fmtDate(value: Date | number | string, options?: Intl.DateTimeFormatOptions, locale = 'ru-RU'): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : safeSpaces(d.toLocaleDateString(locale, options));
}

/** Дата со временем без неразрывных пробелов. Неверная дата → пустая строка. */
export function fmtDateTime(value: Date | number | string, options?: Intl.DateTimeFormatOptions, locale = 'ru-RU'): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : safeSpaces(d.toLocaleString(locale, options));
}
