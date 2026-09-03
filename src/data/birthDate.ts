// Дата рождения в анкете вводится текстом «ДД.ММ.ГГГГ», а в базе Talentslab это
// настоящая дата. Неверный формат сервер отбрасывает молча — поэтому проверяем
// здесь, до отправки, и говорим человеку прямо.

/** Проверяет формат ДД.ММ.ГГГГ и существование такой даты. */
export function isValidBirthDate(value: string): boolean {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  // 1900 — нижняя граница здравого смысла; верхняя — сегодняшний год.
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Проверка «переезда»: 31.02 превратился бы в начало марта.
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Строка «ДД.ММ.ГГГГ» → дата для пикера (полдень локального дня).
 * Полдень, а не полночь: пикер работает в местном времени, и полночь при
 * сдвиге часового пояса легко уезжает на предыдущий день.
 */
export function parseBirthDate(value: string): Date | null {
  if (!isValidBirthDate(value)) return null;
  const [day, month, year] = value.trim().split('.').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/** Дата из пикера → строка «ДД.ММ.ГГГГ», как её ждёт сервер. */
export function formatBirthDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** С чего открывать пикер, если поле пустое: без этого крутить пришлось бы от сегодня. */
export function defaultBirthDate(): Date {
  return new Date(new Date().getFullYear() - 25, 0, 1, 12, 0, 0, 0);
}

/** Нижняя граница пикера — та же, что в проверке. */
export const MIN_BIRTH_DATE = new Date(1900, 0, 1, 12, 0, 0, 0);
