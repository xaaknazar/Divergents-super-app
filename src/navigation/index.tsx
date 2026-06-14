import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  RootStackParams, TabParams, LMSStackParams, CommunityStackParams,
  AIStackParams, CareerStackParams, ProfileStackParams,
} from './types';
import { TabBar } from './TabBar';

import { LMSHomeScreen } from '../screens/lms/LMSHomeScreen';
import { CatalogScreen } from '../screens/lms/CatalogScreen';
import { CourseDetailScreen } from '../screens/lms/CourseDetailScreen';
import { VideoScreen } from '../screens/lms/VideoScreen';

import { CommunityHomeScreen } from '../screens/community/CommunityHomeScreen';
import { ChallengeDetailScreen } from '../screens/community/ChallengeDetailScreen';
import { TripDetailScreen } from '../screens/community/TripDetailScreen';
import { MemberScreen } from '../screens/community/MemberScreen';

import { AIChatScreen } from '../screens/ai/AIChatScreen';
import { CareerHomeScreen } from '../screens/career/CareerHomeScreen';
import { ProfileHomeScreen } from '../screens/profile/ProfileHomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

const LMSStack = createNativeStackNavigator<LMSStackParams>();
function LMSNavigator() {
  return (
    <LMSStack.Navigator screenOptions={{ headerShown: false }}>
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
    <CommunityStack.Navigator screenOptions={{ headerShown: false }}>
      <CommunityStack.Screen name="CommunityHome" component={CommunityHomeScreen} />
      <CommunityStack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <CommunityStack.Screen name="TripDetail" component={TripDetailScreen} />
      <CommunityStack.Screen name="Member" component={MemberScreen} />
    </CommunityStack.Navigator>
  );
}

const AIStack = createNativeStackNavigator<AIStackParams>();
function AINavigator() {
  return (
    <AIStack.Navigator screenOptions={{ headerShown: false }}>
      <AIStack.Screen name="AIChat" component={AIChatScreen} />
    </AIStack.Navigator>
  );
}

const CareerStack = createNativeStackNavigator<CareerStackParams>();
function CareerNavigator() {
  return (
    <CareerStack.Navigator screenOptions={{ headerShown: false }}>
      <CareerStack.Screen name="CareerHome" component={CareerHomeScreen} />
    </CareerStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<ProfileStackParams>();
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileHomeScreen} />
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<TabParams>();
function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="LMSTab" component={LMSNavigator} />
      <Tab.Screen name="AITab" component={AINavigator} />
      <Tab.Screen name="CommunityTab" component={CommunityNavigator} />
      <Tab.Screen name="CareerTab" component={CareerNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

const Root = createNativeStackNavigator<RootStackParams>();
export function RootNavigator() {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
      <Root.Screen name="Onboarding" component={OnboardingScreen} options={{ presentation: 'fullScreenModal' }} />
      <Root.Screen name="Tabs" component={Tabs} />
    </Root.Navigator>
  );
}
