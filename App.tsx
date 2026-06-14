import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/clerk-expo';
import { RootNavigator } from './src/navigation';
import { CourseProvider } from './src/state/CourseContext';
import { ChallengeProvider } from './src/state/ChallengeContext';
import { tokenCache } from './src/state/tokenCache';
import { CLERK_PUBLISHABLE_KEY } from './src/config';
import { T } from './src/theme/tokens';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: T.groupedBg, primary: T.brand },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <SafeAreaProvider>
          <CourseProvider>
            <ChallengeProvider>
              <NavigationContainer theme={navTheme}>
                <StatusBar style="dark" />
                <RootNavigator />
              </NavigationContainer>
            </ChallengeProvider>
          </CourseProvider>
        </SafeAreaProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
