// Public nickname (псевдоним) shown across the app instead of the full name.
//
// Rules (product): Latin letters and digits only, first letter uppercase,
// 3–13 characters, must start with a letter. Instagram-style handle, but
// capitalised — e.g. "Aknazar", "Divergent7".
export const NICKNAME_MAX = 13;
export const NICKNAME_MIN = 3;
export const NICKNAME_RE = /^[A-Z][A-Za-z0-9]{2,12}$/;

export const NICKNAME_HINT =
  'Латиницей, первая буква заглавная, до 13 символов (буквы и цифры)';

export function isValidNickname(v: unknown): v is string {
  return typeof v === 'string' && NICKNAME_RE.test(v.trim());
}

/** Human-readable reason the nickname is rejected, or null when it's valid. */
export function nicknameError(raw: string): string | null {
  const v = (raw ?? '').trim();
  if (!v) return 'Укажите псевдоним';
  if (!/^[A-Za-z0-9]+$/.test(v)) return 'Только латинские буквы и цифры, без пробелов и символов';
  if (!/^[A-Za-z]/.test(v)) return 'Псевдоним должен начинаться с буквы';
  if (v.length < NICKNAME_MIN) return `Минимум ${NICKNAME_MIN} символа`;
  if (v.length > NICKNAME_MAX) return `Максимум ${NICKNAME_MAX} символов`;
  if (v[0] !== v[0].toUpperCase()) return 'Первая буква должна быть заглавной';
  return null;
}

/** Strip invalid characters while typing (keeps the field forgiving). */
export function sanitizeNickname(raw: string): string {
  const cleaned = (raw ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, NICKNAME_MAX);
  return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : cleaned;
}
