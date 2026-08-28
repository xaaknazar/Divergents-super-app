import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  RootStackParams, TabParams, LMSStackParams, CommunityStackParams,
  AIStackParams, CareerStackParams, ProfileStackParams, MapStackParams,
} from './types';
import { TabBar } from './TabBar';
import { useAuth } from '@clerk/clerk-expo';
import { useAppFlow } from '../state/AppFlowContext';
import { useResumeGate } from '../state/ResumeGateContext';
import { usePush } from '../state/usePush';
import { useInviteLinks } from '../state/useInviteLinks';

import { LMSHomeScreen } from '../screens/lms/LMSHomeScreen';
import { CatalogScreen } from '../screens/lms/CatalogScreen';
import { BooksCatalogScreen } from '../screens/lms/BooksCatalogScreen';
import { BookDetailScreen } from '../screens/lms/BookDetailScreen';
import { BookAIScreen } from '../screens/lms/BookAIScreen';
import { CourseDetailScreen } from '../screens/lms/CourseDetailScreen';
import { VideoScreen } from '../screens/lms/VideoScreen';
import { DownloadsScreen } from '../screens/lms/DownloadsScreen';

import { CommunityHomeScreen } from '../screens/community/CommunityHomeScreen';
import { ChannelsScreen } from '../screens/community/ChannelsScreen';
import { ChallengeDetailScreen } from '../screens/community/ChallengeDetailScreen';
import { ChallengeApplicantsScreen } from '../screens/community/ChallengeApplicantsScreen';
import { ChallengeRosterScreen } from '../screens/community/ChallengeRosterScreen';
import { TeamStandingsScreen } from '../screens/community/TeamStandingsScreen';
import { ManageChallengeScreen } from '../screens/community/ManageChallengeScreen';
import { JoinChallengeScreen } from '../screens/community/JoinChallengeScreen';
import { TripDetailScreen } from '../screens/community/TripDetailScreen';
import { ServerChannelScreen } from '../screens/community/ServerChannelScreen';
import { CreateContentScreen } from '../screens/community/CreateContentScreen';
import { WorkoutTrackScreen } from '../screens/community/WorkoutTrackScreen';

import { AIChatScreen } from '../screens/ai/AIChatScreen';
import { MapHomeScreen } from '../screens/map/MapHomeScreen';
import { PlaceDetailScreen } from '../screens/map/PlaceDetailScreen';
import { AddPlaceScreen } from '../screens/map/AddPlaceScreen';
import { OfflineMapScreen } from '../screens/map/OfflineMapScreen';
import { AdminPlacesScreen } from '../screens/map/AdminPlacesScreen';
import { CareerHomeScreen } from '../screens/career/CareerHomeScreen';
import { VacancyDetailScreen } from '../screens/career/VacancyDetailScreen';
import { ResumeFormScreen } from '../screens/career/ResumeFormScreen';
import { TalentProfileScreen } from '../screens/career/TalentProfileScreen';
import { CreateVacancyScreen } from '../screens/career/CreateVacancyScreen';
import { VacancyApplicantsScreen } from '../screens/career/VacancyApplicantsScreen';
import { ProfileHomeScreen } from '../screens/profile/ProfileHomeScreen';
import { AchievementsScreen } from '../screens/profile/AchievementsScreen';
import { PersonalizeScreen } from '../screens/profile/PersonalizeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ResumeGateScreen } from '../screens/ResumeGateScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

const LMSStack = createNativeStackNavigator<LMSStackParams>();
function LMSNavigator() {
  return (
    <LMSStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      <LMSStack.Screen name="LMSHome" component={LMSHomeScreen} />
      <LMSStack.Screen name="Catalog" component={CatalogScreen} />
      <LMSStack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <LMSStack.Screen name="Video" component={VideoScreen} options={{ presentation: 'fullScreenModal' }} />
      <LMSStack.Screen name="Downloads" component={DownloadsScreen} />
      <LMSStack.Screen name="Books" component={BooksCatalogScreen} />
      <LMSStack.Screen name="BookDetail" component={BookDetailScreen} />
      <LMSStack.Screen name="BookAI" component={BookAIScreen} options={{ presentation: 'modal' }} />
    </LMSStack.Navigator>
  );
}

const CommunityStack = createNativeStackNavigator<CommunityStackParams>();
function CommunityNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      <CommunityStack.Screen name="CommunityHome" component={CommunityHomeScreen} />
      <CommunityStack.Screen name="Channels" component={ChannelsScreen} />
      <CommunityStack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <CommunityStack.Screen name="ChallengeApplicants" component={ChallengeApplicantsScreen} />
      <CommunityStack.Screen name="ChallengeRoster" component={ChallengeRosterScreen} />
      <CommunityStack.Screen name="TeamStandings" component={TeamStandingsScreen} />
      <CommunityStack.Screen name="ManageChallenge" component={ManageChallengeScreen} />
      <CommunityStack.Screen name="WorkoutTrack" component={WorkoutTrackScreen} />
      <CommunityStack.Screen name="JoinChallenge" component={JoinChallengeScreen} options={{ presentation: 'modal' }} />
      <CommunityStack.Screen name="TripDetail" component={TripDetailScreen} />
      <CommunityStack.Screen name="ServerChannel" component={ServerChannelScreen} />
      <CommunityStack.Screen name="CreateContent" component={CreateContentScreen} />
    </CommunityStack.Navigator>
  );
}

const AIStack = createNativeStackNavigator<AIStackParams>();
function AINavigator() {
  return (
    <AIStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      <AIStack.Screen name="AIChat" component={AIChatScreen} />
    </AIStack.Navigator>
  );
}

const MapStack = createNativeStackNavigator<MapStackParams>();
function MapNavigator() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      <MapStack.Screen name="MapHome" component={MapHomeScreen} />
      <MapStack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
      <MapStack.Screen name="AddPlace" component={AddPlaceScreen} options={{ presentation: 'modal' }} />
      <MapStack.Screen name="OfflineMap" component={OfflineMapScreen} />
      <MapStack.Screen name="AdminPlaces" component={AdminPlacesScreen} />
    </MapStack.Navigator>
  );
}

const CareerStack = createNativeStackNavigator<CareerStackParams>();
function CareerNavigator() {
  return (
    <CareerStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      <CareerStack.Screen name="CareerHome" component={CareerHomeScreen} />
      <CareerStack.Screen name="VacancyDetail" component={VacancyDetailScreen} />
      <CareerStack.Screen name="Resume" component={ResumeFormScreen} options={{ presentation: 'modal' }} />
      <CareerStack.Screen name="TalentProfile" component={TalentProfileScreen} />
      <CareerStack.Screen name="CreateVacancy" component={CreateVacancyScreen} options={{ presentation: 'modal' }} />
      <CareerStack.Screen name="VacancyApplicants" component={VacancyApplicantsScreen} />
    </CareerStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<ProfileStackParams>();
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileHomeScreen} />
      <ProfileStack.Screen name="Achievements" component={AchievementsScreen} />
      <ProfileStack.Screen name="Personalize" component={PersonalizeScreen} />
      <ProfileStack.Screen name="Downloads" component={DownloadsScreen} />
      <ProfileStack.Screen name="Resume" component={ResumeFormScreen} options={{ presentation: 'modal' }} />
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<TabParams>();
function Tabs() {
  return (
    <Tab.Navigator detachInactiveScreens={false} screenOptions={{ headerShown: false, lazy: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="LMSTab" component={LMSNavigator} />
      <Tab.Screen name="AITab" component={AINavigator} />
      <Tab.Screen name="CommunityTab" component={CommunityNavigator} />
      <Tab.Screen name="MapTab" component={MapNavigator} />
      <Tab.Screen name="CareerTab" component={CareerNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

const Root = createNativeStackNavigator<RootStackParams>();
export function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { ready, onboarded, pendingRegistration } = useAppFlow();
  const { complete: resumeComplete } = useResumeGate();
  usePush();
  useInviteLinks();
  if (!isLoaded || !ready) return null;
  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      {!onboarded ? (
        <Root.Screen name="Onboarding" component={OnboardingScreen} options={{ presentation: 'fullScreenModal' }} />
      ) : !isSignedIn ? (
        <Root.Screen name="Auth" component={AuthScreen} />
      ) : pendingRegistration ? (
        <Root.Screen name="Register" component={RegisterScreen} />
      ) : !resumeComplete ? (
        // Mandatory: no entry to the app until the Talentslab resume is 100% filled.
        <Root.Screen name="ResumeGate" component={ResumeGateScreen} />
      ) : (
        <>
          <Root.Screen name="Tabs" component={Tabs} />
          <Root.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'fullScreenModal' }} />
        </>
      )}
    </Root.Navigator>
  );
}
