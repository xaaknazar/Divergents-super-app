import type { NavigatorScreenParams } from '@react-navigation/native';

export type LMSStackParams = {
  LMSHome: undefined;
  Catalog: undefined;
  CourseDetail: { courseId: string };
  Video: { courseId: string; lessonId: string };
};

export type CommunityStackParams = {
  // `refresh` is a changing token a create modal sets on dismissal so the home
  // screen reloads its lists once.
  CommunityHome: { refresh?: number } | undefined;
  Channel: { channelId: string };
  ChannelPost: { postId: string };
  CreateContent: undefined;
  ChallengeDetail: { challengeId: string };
  JoinChallenge: { challengeId: string; live?: { id: string; title: string; durationDays: number; startISO?: string | null; teams: { id: string; name: string; capacity: number; captain?: string | null; _count?: { applications: number } }[] } };
  TripDetail: { tripId: string };
};

export type AIStackParams = { AIChat: undefined };
export type MapStackParams = { MapHome: undefined; PlaceDetail: { placeId: string }; AddPlace: { lat?: number; lng?: number; editId?: string } | undefined; OfflineMap: undefined };
export type CareerStackParams = { CareerHome: undefined; VacancyDetail: { jobId: string }; Resume: undefined; TalentProfile: undefined };
export type ProfileStackParams = { ProfileHome: undefined; Achievements: undefined; Personalize: undefined };

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
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParams>;
  Notifications: undefined;
};
