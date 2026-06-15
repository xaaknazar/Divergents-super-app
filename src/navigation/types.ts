import type { NavigatorScreenParams } from '@react-navigation/native';

export type LMSStackParams = {
  LMSHome: undefined;
  Catalog: undefined;
  CourseDetail: { courseId: string };
  Video: { courseId: string; lessonId: string };
};

export type CommunityStackParams = {
  CommunityHome: undefined;
  ChallengeDetail: { challengeId: string };
  JoinChallenge: { challengeId: string };
  TripDetail: { tripId: string };
  Member: { memberId: string };
};

export type AIStackParams = { AIChat: undefined };
export type CareerStackParams = { CareerHome: undefined };
export type ProfileStackParams = { ProfileHome: undefined; Settings: undefined };

export type TabParams = {
  LMSTab: NavigatorScreenParams<LMSStackParams>;
  AITab: NavigatorScreenParams<AIStackParams>;
  CommunityTab: NavigatorScreenParams<CommunityStackParams>;
  CareerTab: NavigatorScreenParams<CareerStackParams>;
  ProfileTab: NavigatorScreenParams<ProfileStackParams>;
};

export type RootStackParams = {
  Onboarding: undefined;
  Auth: undefined;
  Tabs: NavigatorScreenParams<TabParams>;
};
