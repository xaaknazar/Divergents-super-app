import type { NavigatorScreenParams } from '@react-navigation/native';

export type LMSStackParams = {
  LMSHome: undefined;
  Catalog: undefined;
  CourseDetail: { courseId: string };
  Video: { courseId: string; lessonId: string };
};

export type CommunityStackParams = {
  CommunityHome: undefined;
  ChannelPost: { postId: string };
  ChallengeDetail: { challengeId: string };
  JoinChallenge: { challengeId: string };
  TripDetail: { tripId: string };
};

export type AIStackParams = { AIChat: undefined };
export type MapStackParams = { MapHome: undefined; PlaceDetail: { placeId: string }; AddPlace: { lat?: number; lng?: number; editId?: string } | undefined };
export type CareerStackParams = { CareerHome: undefined; VacancyDetail: { jobId: string }; Resume: undefined; TalentProfile: undefined };
export type ProfileStackParams = { ProfileHome: undefined; Settings: undefined; Achievements: undefined; Personalize: undefined };

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
