import { createNavigationContainerRef } from '@react-navigation/native';
export const navigationRef = createNavigationContainerRef<any>();

/**
 * Normalize backend notification targets into the current tab payload shape.
 *
 * `initial: false` — обязателен. Без него переход в ещё не открытую вкладку
 * делает целевой экран ЕДИНСТВЕННЫМ в её стеке: домашний экран вкладки под ним
 * не создаётся. Из-за этого кнопка «назад» проваливалась мимо стека на прошлую
 * вкладку (с челленджа кидало в «Обучение»), а сама вкладка потом открывалась
 * сразу на целевом экране. С `initial: false` домашний экран вкладки кладётся
 * в историю под целевым, и «назад» работает как ожидается.
 */
export function normalizeTabTarget(tab: string, screen?: string | null, params?: unknown) {
  // Цель без экрана («открыть вкладку») — валидна: админ может задать только
  // вкладку. Раньше такие уведомления теряли цель целиком и становились
  // «мёртвыми» строками без шеврона.
  // Без экрана параметры уходят самой вкладке — навигатор передаёт их своему
  // начальному экрану.
  if (!screen) return { screen: tab, ...(params != null ? { params } : {}) };
  return { screen: tab, params: { screen, params, initial: false } };
}
