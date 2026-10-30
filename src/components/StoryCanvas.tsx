import { useFonts } from 'expo-font';
import React from 'react';
import { ActivityIndicator,ScrollView,StyleSheet,View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { darkTheme,lightTheme,TextSizeKey } from '../theme/tokens';
import { ThemePreviewProvider } from './ThemePreviewProvider';

export interface StoryCanvasProps {
  children: React.ReactNode;
  scheme?: 'light' | 'dark';
  textSize?: TextSizeKey;
  viewport?: 'phone' | 'compact' | 'tablet';
  layout?: 'content' | 'screen';
  reduceMotion?: boolean;
  reduceTransparency?: boolean;
}

/** Development-only preview surface, not imported by the application. */
export function StoryCanvas({ children, scheme = 'light', textSize = 'md', viewport = 'phone',
  layout = 'content', reduceMotion = true, reduceTransparency = true }: StoryCanvasProps) {
  const [ready] = useFonts({
    'GothamRnd-Light': require('../../assets/fonts/gothamrnd_light.otf'),
    'GothamRnd-Book': require('../../assets/fonts/gothamrnd_book.otf'),
    'GothamRnd-Medium': require('../../assets/fonts/gothamrnd_medium.otf'),
    'GothamRnd-Bold': require('../../assets/fonts/gothamrnd_bold.otf'),
  });
  const T = scheme === 'dark' ? darkTheme : lightTheme;
  const content = ready ? children : <ActivityIndicator accessibilityLabel="Загрузка шрифтов" color={T.brandText} />;
  return <SafeAreaProvider><ThemePreviewProvider scheme={scheme} textSize={textSize}
    reduceMotion={reduceMotion} reduceTransparency={reduceTransparency}>
    {layout === 'screen' ? (
      <View style={[styles.frame, { backgroundColor: T.groupedBg }]}>
        <View style={[styles.content, styles[viewport], styles.surface]}>{content}</View>
      </View>
    ) : <ScrollView style={[styles.surface, { backgroundColor: T.groupedBg }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.content, styles[viewport]]}>
        {content}
      </View>
    </ScrollView>}
  </ThemePreviewProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  surface: { flex: 1 }, scroll: { flexGrow: 1, padding: 16, alignItems: 'center' },
  frame: { flex: 1, alignItems: 'center' },
  content: { width: '100%', gap: 16 }, phone: { maxWidth: 430 }, compact: { maxWidth: 320 }, tablet: { maxWidth: 768 },
});
