// Перевод цвета между hex и HSL — для выбора цвета ползунками.
//
// Три ползунка (тон, насыщенность, светлота) понятнее человеку, чем RGB: «чуть
// темнее» — это один ползунок влево, а не три числа. Хранится всё в hex, чтобы
// цвет напрямую шёл в стили.

export interface HSL { h: number; s: number; l: number }

/** «#3d5bdb» → { h, s, l } в градусах и процентах. Мусор → чёрный. */
export function hexToHsl(hex: string): HSL {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, l: 0 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

/** { h, s, l } → «#RRGGBB» (заглавными). */
export function hslToHex({ h, s, l }: HSL): string {
  const S = Math.min(100, Math.max(0, s)) / 100;
  const L = Math.min(100, Math.max(0, l)) / 100;
  const H = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = L - c / 2;
  let r = 0, g = 0, b = 0;
  if (H < 60) [r, g, b] = [c, x, 0];
  else if (H < 120) [r, g, b] = [x, c, 0];
  else if (H < 180) [r, g, b] = [0, c, x];
  else if (H < 240) [r, g, b] = [0, x, c];
  else if (H < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** Приводит ввод «3d5bdb», «#3D5BDB» к «#3D5BDB»; иначе null. */
export function normalizeHex(input: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(input.trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

/** Светлый ли цвет — чтобы выбрать читаемый цвет текста поверх него. */
export function isLight(hex: string): boolean {
  return hexToHsl(hex).l > 60;
}
