// Personalization presets: accent colors + background (aurora) styles.

export function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export interface Accent {
  key: string;
  name: string;
  light: { brand: string; accent: string };
  dark: { brand: string; accent: string };
}

export const ACCENTS: Accent[] = [
  { key: 'divergents', name: 'Divergents', light: { brand: '#234088', accent: '#3D5BDB' }, dark: { brand: '#3D5BDB', accent: '#8AA0FF' } },
  { key: 'royal',      name: 'Королевский', light: { brand: '#4338CA', accent: '#6366F1' }, dark: { brand: '#6366F1', accent: '#A5B4FC' } },
  { key: 'violet',     name: 'Фиолет',      light: { brand: '#6D28D9', accent: '#8B5CF6' }, dark: { brand: '#8B5CF6', accent: '#C4B5FD' } },
  { key: 'fuchsia',    name: 'Фуксия',      light: { brand: '#A21CAF', accent: '#D946EF' }, dark: { brand: '#D946EF', accent: '#F0ABFC' } },
  { key: 'rose',       name: 'Роза',        light: { brand: '#BE123C', accent: '#F43F5E' }, dark: { brand: '#FB7185', accent: '#FDA4AF' } },
  { key: 'sunset',     name: 'Закат',       light: { brand: '#C2410C', accent: '#F97316' }, dark: { brand: '#F97316', accent: '#FDBA74' } },
  { key: 'amber',      name: 'Золото',      light: { brand: '#B45309', accent: '#F59E0B' }, dark: { brand: '#FBBF24', accent: '#FCD34D' } },
  { key: 'emerald',    name: 'Изумруд',     light: { brand: '#047857', accent: '#10B981' }, dark: { brand: '#10B981', accent: '#6EE7B7' } },
  { key: 'forest',     name: 'Лес',         light: { brand: '#3F6212', accent: '#65A30D' }, dark: { brand: '#84CC16', accent: '#BEF264' } },
  { key: 'teal',       name: 'Океан',       light: { brand: '#0E7490', accent: '#06B6D4' }, dark: { brand: '#22D3EE', accent: '#67E8F9' } },
  { key: 'sky',        name: 'Небо',        light: { brand: '#0369A1', accent: '#0EA5E9' }, dark: { brand: '#38BDF8', accent: '#7DD3FC' } },
  { key: 'graphite',   name: 'Графит',      light: { brand: '#334155', accent: '#64748B' }, dark: { brand: '#94A3B8', accent: '#CBD5E1' } },
];

export interface Background {
  key: string;
  name: string;
  // null colors → resolved from the current accent ('accent') or no glow ('none')
  colors: [string, string, string] | null;
}

export const BACKGROUNDS: Background[] = [
  { key: 'accent',  name: 'По акценту',  colors: null },
  { key: 'aurora',  name: 'Аврора',      colors: ['#6366F1', '#3D5BDB', '#38BDF8'] },
  { key: 'sunrise', name: 'Рассвет',     colors: ['#F97316', '#F43F5E', '#FBBF24'] },
  { key: 'ocean',   name: 'Океан',       colors: ['#06B6D4', '#3B82F6', '#22D3EE'] },
  { key: 'nebula',  name: 'Небула',      colors: ['#8B5CF6', '#D946EF', '#6366F1'] },
  { key: 'forest',  name: 'Лес',         colors: ['#10B981', '#65A30D', '#34D399'] },
  { key: 'candy',   name: 'Карамель',    colors: ['#F472B6', '#A78BFA', '#38BDF8'] },
  { key: 'gold',    name: 'Золотой час', colors: ['#F59E0B', '#FB7185', '#F472B6'] },
  { key: 'mono',    name: 'Моно',        colors: ['#94A3B8', '#64748B', '#334155'] },
  { key: 'none',    name: 'Без фона',    colors: null },
];
