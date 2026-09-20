import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Содержимое карточки «поделиться» без маршрута: рекорд, цель, показатель.
 * Только строки и числа — параметры навигации должны сериализоваться.
 */
export interface ShareCard {
  title?: string;
  stats: { l: string; v: string }[];
  caption?: string;
}
export type ShareParams = { workoutId: string; card?: undefined } | { workoutId?: undefined; card: ShareCard };

export type LMSStackParams = {
  LMSHome: undefined;
  CourseDetail: { courseId: string };
  Video: { courseId: string; lessonId: string };
  Downloads: undefined;
  Books: undefined;
  BookDetail: { bookId: string };
  BookAI: undefined;
};

export type CommunityStackParams = {
  // `refresh` is a changing token a create modal sets on dismissal so the home
  // screen reloads its lists once. `focus` switches to the tab that shows the
  // just-created content (e.g. a new challenge → the Челленджи tab).
  CommunityHome: { refresh?: number; focus?: 'challenge' | 'trip' | 'meetup' | 'sport' | 'channel' } | undefined;
  Channels: undefined;
  ServerChannel: { channelId: string };
  CreateContent: undefined;
  ChallengeDetail: { challengeId: string };
  ChallengeApplicants: { challengeId: string; applicantUserId?: string };
  ChallengeRoster: { challengeId: string };
  TeamStandings: { challengeId: string };
  /** Рейтинг всех участников челленджа, а не только своей команды. */
  OverallStandings: { challengeId: string };
  /** История по дням: результат каждого прошедшего дня. */
  ChallengeDays: { challengeId: string };
  /** Итоги завершённого челленджа: свои цифры, команда, лучшие. */
  ChallengeResults: { challengeId: string };
  ManageChallenge: { challengeId: string };
  WorkoutTrack: { challengeId?: string } | undefined;
  /** История тренировок: маршруты, дистанция, время, темп. */
  WorkoutHistory: undefined;
  WorkoutDetail: { workoutId: string };
  /** Карточка для сторис: тренировка (с маршрутом) или готовые строки. */
  WorkoutShare: ShareParams;
  JoinChallenge: { challengeId: string; live?: { id: string; title: string; durationDays: number; startISO?: string | null; teams: { id: string; name: string; capacity: number; captain?: string | null; _count?: { applications: number } }[] } };
  TripDetail: { tripId: string };
  /** Мероприятие — встреча сообщества. На сервере называется Meetup. */
  MeetupDetail: { meetupId: string };
  // Разбор заявок на офлайн-событие. Один экран на поездки, спорт и
  // мероприятия: логика одинаковая, различается только слово в заголовке.
  EventApplicants: { kind: 'trip' | 'sport' | 'meetup'; eventId: string; title?: string };
};

export type AIStackParams = { AIChat: undefined };
export type MapStackParams = { MapHome: undefined; PlaceDetail: { placeId: string }; AddPlace: { lat?: number; lng?: number; editId?: string } | undefined; OfflineMap: undefined; AdminPlaces: undefined };
export type TalentProfileParams = { origin?: 'profile' } | undefined;
export type CareerStackParams = { CareerHome: undefined; VacancyDetail: { jobId: string }; Resume: { step?: number } | undefined; TalentProfile: TalentProfileParams; CreateVacancy: undefined; VacancyApplicants: { jobId: string } };
export type ProfileStackParams = {
  ProfileHome: undefined;
  Achievements: undefined;
  ChallengeHistory: undefined;
  Personalize: undefined;
  Downloads: undefined;
  Resume: { step?: number } | undefined;
  TalentProfile: TalentProfileParams;
  /** Физические показатели: рекорды, цели, показатели, история забегов. */
  MyFitness: undefined;
  // Тренировки доступны и из профиля — те же экраны, что в сообществе.
  WorkoutTrack: { challengeId?: string } | undefined;
  WorkoutHistory: undefined;
  WorkoutDetail: { workoutId: string };
  WorkoutShare: ShareParams;
};

export type TabParams = {
  LMSTab: NavigatorScreenParams<LMSStackParams>;
  AITab: NavigatorScreenParams<AIStackParams>;
  CommunityTab: NavigatorScreenParams<CommunityStackParams>;
  MapTab: NavigatorScreenParams<MapStackParams>;
  CareerTab: NavigatorScreenParams<CareerStackParams>;
  ProfileTab: NavigatorScreenParams<ProfileStackParams>;
};

export type RootStackParams = {
  Onboarding: undefined;
  Auth: undefined;
  NicknameGate: undefined;
  Tabs: NavigatorScreenParams<TabParams>;
  Notifications: undefined;
};
