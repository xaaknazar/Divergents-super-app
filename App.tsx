import React from 'react';
import { Platform, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { resourceCache } from '@clerk/clerk-expo/resource-cache';
import { useFonts } from 'expo-font';
import { RootNavigator } from './src/navigation';
import { navigationRef } from './src/navigation/ref';
import { CourseProvider } from './src/state/CourseContext';
import { ChallengeProvider } from './src/state/ChallengeContext';
import { CareerProvider } from './src/state/CareerContext';
import { EnrollmentProvider } from './src/state/EnrollmentContext';
import { PlacesProvider } from './src/state/PlacesContext';
import { ChannelProvider } from './src/state/ChannelContext';
import { ActivityProvider } from './src/state/ActivityContext';
import { NotificationsProvider } from './src/state/NotificationsContext';
import { tokenCache } from './src/state/tokenCache';
import { CLERK_PUBLISHABLE_KEY } from './src/config';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppFlowProvider } from './src/state/AppFlowContext';
import { ResumeGateProvider } from './src/state/ResumeGateContext';
import { ModerationProvider } from './src/state/ModerationContext';
import { LanguageProvider } from './src/state/LanguageContext';
import { PageIntroProvider } from './src/state/PageIntroContext';
import { IntroSplash } from './src/screens/IntroSplash';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

const linking = {
  prefixes: [Linking.createURL('/'), 'divergents://', 'https://divergents-lms.kz/app'],
  config: {
    screens: {
      Onboarding: 'onboarding',
      Auth: 'auth',
      Register: 'register',
      ResumeGate: 'resume-gate',
      Notifications: 'notifications',
      Tabs: {
        screens: {
          LMSTab: {
            screens: {
              LMSHome: 'learning',
              Catalog: 'learning/catalog',
              CourseDetail: 'learning/courses/:courseId',
              Video: 'learning/courses/:courseId/lessons/:lessonId',
              Downloads: 'learning/downloads',
              Books: 'learning/books',
              BookDetail: 'learning/books/:bookId',
              BookAI: 'learning/books/ai',
            },
          },
          AITab: { screens: { AIChat: 'ai' } },
          CommunityTab: {
            screens: {
              CommunityHome: 'community',
              ChallengeDetail: 'community/challenges/:challengeId',
              TripDetail: 'community/trips/:tripId',
              ServerChannel: 'community/channels/:channelId',
              WorkoutTrack: 'community/workout',
            },
          },
          MapTab: {
            screens: {
              MapHome: 'map',
              PlaceDetail: 'map/places/:placeId',
            },
          },
          ProfileTab: {
            screens: {
              ProfileHome: 'profile',
              Career: {
                screens: {
                  CareerHome: 'career',
                  VacancyDetail: 'career/vacancies/:jobId',
                  TalentProfile: 'career/profile',
                },
              },
            },
          },
        },
      },
    },
  },
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Root() {
  const { T, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: T.groupedBg,
      card: T.cardBg,
      text: T.label,
      border: T.separator,
      primary: T.brand,
    },
  };
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

// Data providers hold per-user in-memory state. Keying this subtree by the
// signed-in Clerk user id forces a full remount on account change, so user B
// never sees user A's in-memory courses/resume/applications/etc. Persisted
// data is wiped separately via clearAllAppData() on sign-out / delete.
function UserScopedProviders({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  return (
    <React.Fragment key={userId ?? 'anon'}>
      <CourseProvider>
        <ChallengeProvider>
          <ActivityProvider>
          <CareerProvider>
            <EnrollmentProvider>
              <PlacesProvider>
                <ChannelProvider>
                  <NotificationsProvider>
                    <ModerationProvider>
                      <ResumeGateProvider>
                        {children}
                      </ResumeGateProvider>
                    </ModerationProvider>
                  </NotificationsProvider>
                </ChannelProvider>
              </PlacesProvider>
            </EnrollmentProvider>
          </CareerProvider>
          </ActivityProvider>
        </ChallengeProvider>
      </CourseProvider>
    </React.Fragment>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'GothamRnd-Light': require('./assets/fonts/gothamrnd_light.otf'),
    'GothamRnd-Book': require('./assets/fonts/gothamrnd_book.otf'),
    'GothamRnd-Medium': require('./assets/fonts/gothamrnd_medium.otf'),
    'GothamRnd-Bold': require('./assets/fonts/gothamrnd_bold.otf'),
    'GothamRnd-LightItalic': require('./assets/fonts/gothamrnd_lightitalic.otf'),
    'GothamRnd-BookItalic': require('./assets/fonts/gothamrnd_bookitalic.otf'),
    'GothamRnd-MediumItalic': require('./assets/fonts/gothamrnd_mediumitalic.otf'),
    'GothamRnd-BoldItalic': require('./assets/fonts/gothamrnd_bolditalic.otf'),
  });
  // The animated intro stays mounted on top until it cross-fades itself out.
  // It self-gates on `fontsLoaded` + a tasteful minimum duration, so the app
  // (mounted underneath only once fonts are ready) is revealed without a flash.
  const [introDone, setIntroDone] = React.useState(false);

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
          tokenCache={tokenCache}
          // Persist Clerk's client/environment resources as well as the JWT.
          // Without this, Clerk cannot reconstruct the signed-in session on a
          // cold launch with no network, so the whole navigator stays locked.
          __experimental_resourceCache={resourceCache}
        >
          <AppFlowProvider>
          <LanguageProvider>
          <SafeAreaProvider>
            <PageIntroProvider>
              <UserScopedProviders>
                {fontsLoaded ? <Root /> : null}
                {!introDone ? (
                  <IntroSplash fontsLoaded={fontsLoaded} onDone={() => setIntroDone(true)} />
                ) : null}
              </UserScopedProviders>
            </PageIntroProvider>
          </SafeAreaProvider>
          </LanguageProvider>
          </AppFlowProvider>
        </ClerkProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
