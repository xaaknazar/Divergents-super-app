import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import {
  RootStackParams, TabParams, LMSStackParams, CommunityStackParams,
  AIStackParams, CareerStackParams, ProfileStackParams, MapStackParams,
} from './types';
import { TabBar } from './TabBar';
import { useAuth } from '@clerk/clerk-expo';
import { useAppFlow } from '../state/AppFlowContext';
import { useTheme } from '../theme/ThemeContext';

import { LMSHomeScreen } from '../screens/lms/LMSHomeScreen';
import { CatalogScreen } from '../screens/lms/CatalogScreen';
import { CourseDetailScreen } from '../screens/lms/CourseDetailScreen';
import { VideoScreen } from '../screens/lms/VideoScreen';

import { CommunityHomeScreen } from '../screens/community/CommunityHomeScreen';
import { ChallengeDetailScreen } from '../screens/community/ChallengeDetailScreen';
import { JoinChallengeScreen } from '../screens/community/JoinChallengeScreen';
import { TripDetailScreen } from '../screens/community/TripDetailScreen';
import { ChannelScreen } from '../screens/community/ChannelScreen';
import { ChannelPostScreen } from '../screens/community/ChannelPostScreen';
import { CreateChallengeScreen } from '../screens/community/CreateChallengeScreen';
import { CreateTripScreen } from '../screens/community/CreateTripScreen';
import { CreateChannelScreen } from '../screens/community/CreateChannelScreen';

import { AIChatScreen } from '../screens/ai/AIChatScreen';
import { MapHomeScreen } from '../screens/map/MapHomeScreen';
import { PlaceDetailScreen } from '../screens/map/PlaceDetailScreen';
import { AddPlaceScreen } from '../screens/map/AddPlaceScreen';
import { OfflineMapScreen } from '../screens/map/OfflineMapScreen';
import { CareerHomeScreen } from '../screens/career/CareerHomeScreen';
import { VacancyDetailScreen } from '../screens/career/VacancyDetailScreen';
import { ResumeFormScreen } from '../screens/career/ResumeFormScreen';
import { TalentProfileScreen } from '../screens/career/TalentProfileScreen';
import { ProfileHomeScreen } from '../screens/profile/ProfileHomeScreen';
import { AchievementsScreen } from '../screens/profile/AchievementsScreen';
import { PersonalizeScreen } from '../screens/profile/PersonalizeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

const LMSStack = createNativeStackNavigator<LMSStackParams>();
function LMSNavigator() {
  return (
    <LMSStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      <LMSStack.Screen name="LMSHome" component={LMSHomeScreen} />
      <LMSStack.Screen name="Catalog" component={CatalogScreen} />
      <LMSStack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <LMSStack.Screen name="Video" component={VideoScreen} options={{ presentation: 'fullScreenModal' }} />
    </LMSStack.Navigator>
  );
}

const CommunityStack = createNativeStackNavigator<CommunityStackParams>();
function CommunityNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      <CommunityStack.Screen name="CommunityHome" component={CommunityHomeScreen} />
      <CommunityStack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <CommunityStack.Screen name="JoinChallenge" component={JoinChallengeScreen} options={{ presentation: 'modal' }} />
      <CommunityStack.Screen name="TripDetail" component={TripDetailScreen} />
      <CommunityStack.Screen name="Channel" component={ChannelScreen} />
      <CommunityStack.Screen name="ChannelPost" component={ChannelPostScreen} />
      <CommunityStack.Screen name="CreateChallenge" component={CreateChallengeScreen} options={{ presentation: 'modal' }} />
      <CommunityStack.Screen name="CreateTrip" component={CreateTripScreen} options={{ presentation: 'modal' }} />
      <CommunityStack.Screen name="CreateChannel" component={CreateChannelScreen} options={{ presentation: 'modal' }} />
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

// Deep-link / universal-link config. Exported so the NavigationContainer (in
// App.tsx) can pass it via its `linking` prop. Supports divergents:// and the
// website https origin, plus Expo dev URLs.
export const linking: LinkingOptions<RootStackParams> = {
  prefixes: [Linking.createURL('/'), 'divergents://', 'https://divergents-lms.kz'],
  config: {
    screens: {
      Onboarding: 'onboarding',
      Auth: 'auth',
      Register: 'register',
      Notifications: 'notifications',
      Tabs: {
        screens: {
          LMSTab: {
            screens: {
              LMSHome: 'learn',
              Catalog: 'catalog',
              CourseDetail: 'course/:courseId',
              Video: 'course/:courseId/lesson/:lessonId',
            },
          },
          AITab: { screens: { AIChat: 'ai' } },
          CommunityTab: {
            screens: {
              CommunityHome: 'community',
              Channel: 'channel/:channelId',
              ChannelPost: 'post/:postId',
              ChallengeDetail: 'challenge/:challengeId',
              TripDetail: 'trip/:tripId',
            },
          },
          MapTab: { screens: { MapHome: 'map', PlaceDetail: 'place/:placeId' } },
          CareerTab: {
            screens: { CareerHome: 'career', VacancyDetail: 'vacancy/:jobId', TalentProfile: 'talent' },
          },
          ProfileTab: {
            screens: { ProfileHome: 'profile', Achievements: 'achievements', Personalize: 'personalize' },
          },
        },
      },
    },
  },
};

function NavLoader() {
  const { T } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.systemBg }}>
      <ActivityIndicator color={T.brand} />
    </View>
  );
}

const Root = createNativeStackNavigator<RootStackParams>();
export function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { ready, onboarded, pendingRegistration } = useAppFlow();
  if (!isLoaded || !ready) return <NavLoader />;
  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 220, gestureEnabled: true }}>
      {!onboarded ? (
        <Root.Screen name="Onboarding" component={OnboardingScreen} options={{ presentation: 'fullScreenModal' }} />
      ) : !isSignedIn ? (
        <Root.Screen name="Auth" component={AuthScreen} />
      ) : pendingRegistration ? (
        <Root.Screen name="Register" component={RegisterScreen} />
      ) : (
        <>
          <Root.Screen name="Tabs" component={Tabs} />
          <Root.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'modal' }} />
        </>
      )}
    </Root.Navigator>
  );
}
