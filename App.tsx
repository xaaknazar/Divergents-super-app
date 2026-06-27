import React from 'react';
import { Platform, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { useFonts } from 'expo-font';
import { RootNavigator } from './src/navigation';
import { navigationRef } from './src/navigation/ref';
import { CourseProvider } from './src/state/CourseContext';
import { ChallengeProvider } from './src/state/ChallengeContext';
import { CareerProvider } from './src/state/CareerContext';
import { EnrollmentProvider } from './src/state/EnrollmentContext';
import { PlacesProvider } from './src/state/PlacesContext';
import { ChannelProvider } from './src/state/ChannelContext';
import { DownloadsProvider } from './src/state/DownloadsContext';
import { NotificationsProvider } from './src/state/NotificationsContext';
import { tokenCache } from './src/state/tokenCache';
import { CLERK_PUBLISHABLE_KEY } from './src/config';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppFlowProvider } from './src/state/AppFlowContext';
import { LanguageProvider } from './src/state/LanguageContext';
import { IntroSplash } from './src/screens/IntroSplash';

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
    <NavigationContainer ref={navigationRef} theme={navTheme}>
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
          <CareerProvider>
            <EnrollmentProvider>
              <PlacesProvider>
                <ChannelProvider>
                  <DownloadsProvider>
                  <NotificationsProvider>
                    {children}
                  </NotificationsProvider>
                  </DownloadsProvider>
                </ChannelProvider>
              </PlacesProvider>
            </EnrollmentProvider>
          </CareerProvider>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <AppFlowProvider>
          <LanguageProvider>
          <SafeAreaProvider>
            <UserScopedProviders>
              {fontsLoaded ? <Root /> : null}
              {!introDone ? (
                <IntroSplash fontsLoaded={fontsLoaded} onDone={() => setIntroDone(true)} />
              ) : null}
            </UserScopedProviders>
          </SafeAreaProvider>
          </LanguageProvider>
          </AppFlowProvider>
        </ClerkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
