import React from 'react';
import { View, ActivityIndicator, Platform, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/clerk-expo';
import {
  useFonts,
  Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { RootNavigator } from './src/navigation';
import { CourseProvider } from './src/state/CourseContext';
import { ChallengeProvider } from './src/state/ChallengeContext';
import { CareerProvider } from './src/state/CareerContext';
import { EnrollmentProvider } from './src/state/EnrollmentContext';
import { PlacesProvider } from './src/state/PlacesContext';
import { NotificationsProvider } from './src/state/NotificationsContext';
import { tokenCache } from './src/state/tokenCache';
import { CLERK_PUBLISHABLE_KEY } from './src/config';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppFlowProvider } from './src/state/AppFlowContext';
import { LanguageProvider } from './src/state/LanguageContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Loader() {
  const { T } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.systemBg }}>
      <ActivityIndicator color={T.brand} />
    </View>
  );
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
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <AppFlowProvider>
          <LanguageProvider>
          <SafeAreaProvider>
            <CourseProvider>
              <ChallengeProvider>
                <CareerProvider>
                  <EnrollmentProvider>
                    <PlacesProvider>
                      <NotificationsProvider>
                        {fontsLoaded ? <Root /> : <Loader />}
                      </NotificationsProvider>
                    </PlacesProvider>
                  </EnrollmentProvider>
                </CareerProvider>
              </ChallengeProvider>
            </CourseProvider>
          </SafeAreaProvider>
          </LanguageProvider>
          </AppFlowProvider>
        </ClerkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
