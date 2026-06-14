import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation';
import { CourseProvider } from './src/state/CourseContext';
import { ChallengeProvider } from './src/state/ChallengeContext';
import { T } from './src/theme/tokens';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: T.groupedBg, primary: T.brand },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
