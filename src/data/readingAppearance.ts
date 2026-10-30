export const READING_CARD_STYLES = [
  { id: 'feature', title: 'Тишина и бумага', description: 'Книжная иллюстрация, спокойная поверхность и лёгкий акцент' },
  { id: 'compact', title: 'Компактная', description: 'Короткая карточка с самым важным' },
] as const;
export const READING_HEADER_STYLES = [
  { id: 'editorial', title: '01 · Тишина и бумага' },
  { id: 'glass', title: '02 · Стекло' },
  { id: 'journal', title: '03 · Дневник' },
  { id: 'focus', title: '04 · Час для себя' },
  { id: 'ticket', title: '05 · Приглашение' },
  { id: 'split', title: '06 · Баланс' },
  { id: 'cover', title: '07 · Обложка книги' },
  { id: 'community', title: '08 · Вместе' },
  { id: 'minimal', title: '09 · Минимализм' },
  { id: 'compact', title: '10 · Коротко' },
] as const;
export type ReadingCardStyle = typeof READING_CARD_STYLES[number]['id'];
export type ReadingHeaderStyle = typeof READING_HEADER_STYLES[number]['id'];
export type ReadingAppearance = { card: ReadingCardStyle; header: ReadingHeaderStyle };
export const DEFAULT_READING_APPEARANCE: ReadingAppearance = { card: 'feature', header: 'editorial' };
export function parseReadingAppearance(value: unknown): ReadingAppearance {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    card: READING_CARD_STYLES.find(s => s.id === v.card)?.id ?? DEFAULT_READING_APPEARANCE.card,
    header: READING_HEADER_STYLES.find(s => s.id === v.header)?.id ?? DEFAULT_READING_APPEARANCE.header,
  };
}
