import { createNavigationContainerRef } from '@react-navigation/native';
export const navigationRef = createNavigationContainerRef<any>();

/**
 * Экраны, которым нужен идентификатор в параметрах. Уведомление, созданное в
 * админке без параметров, открывало такой экран пустым — он разбирал
 * `route.params` и падал, а человек видел «Что-то пошло не так» и вылетал из
 * приложения. Открываем вкладку: пусто, но живо.
 */
const SCREEN_REQUIRES_PARAM: Record<string, string> = {
  ChallengeDetail: 'challengeId',
  ChallengeApplicants: 'challengeId',
  ChallengeRoster: 'challengeId',
  ManageChallenge: 'challengeId',
  JoinChallenge: 'challengeId',
  TeamStandings: 'challengeId',
  ChallengeDays: 'challengeId',
  ChallengeResults: 'challengeId',
  OverallStandings: 'challengeId',
  TripDetail: 'tripId',
  MeetupDetail: 'meetupId',
  WorkoutDetail: 'workoutId',
  EventApplicants: 'eventId',
  ServerChannel: 'channelId',
  CourseDetail: 'courseId',
  Video: 'courseId',
  BookDetail: 'bookId',
  PlaceDetail: 'placeId',
  VacancyDetail: 'jobId',
  VacancyApplicants: 'jobId',
};

/** Есть ли в параметрах непустой идентификатор, который требует экран. */
function hasRequiredParam(screen: string, params: unknown): boolean {
  const key = SCREEN_REQUIRES_PARAM[screen];
  if (!key) return true;
  const value = (params as Record<string, unknown> | null | undefined)?.[key];
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

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
  // Цель без нужного идентификатора — открываем вкладку, а не пустой экран.
  if (!hasRequiredParam(screen, params)) return { screen: tab };
  return { screen: tab, params: { screen, params, initial: false } };
}

/**
 * Открыть анкету на нужном шаге из любого места приложения.
 *
 * Форма зарегистрирована в стеках «Карьера» и «Профиль»; из сообщества до неё
 * иначе не дотянуться, а заводить третью копию экрана — плодить расхождения.
 */
export function openResume(step = 0) {
  if (!navigationRef.isReady()) return;
  (navigationRef as any).navigate('Tabs', normalizeTabTarget('ProfileTab', 'Resume', { step }));
}
