import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const artwork = {
  light: require('../../assets/design/reading/engraving-light.png'),
  dark: require('../../assets/design/reading/engraving-dark.png'),
};

export interface ReadingBookIllustrationProps {
  placement?: 'card' | 'header';
}

/** Original decorative engraving. Titles, dates and actions remain native text. */
export function ReadingBookIllustration({ placement = 'card' }: ReadingBookIllustrationProps) {
  const { isDark } = useTheme();
  return <View testID={`reading-book-illustration-${placement}`} pointerEvents="none"
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.frame, styles[placement]]}>
    <Image source={isDark ? artwork.dark : artwork.light} contentFit="contain"
      accessible={false} style={styles.artwork} />
  </View>;
}

const styles = StyleSheet.create({
  frame: { maxWidth: '100%', aspectRatio: 1.5, flexShrink: 0 },
  card: { width: 144 },
  header: { width: 252 },
  artwork: { width: '100%', height: '100%' },
});
