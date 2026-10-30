import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const artwork = {
  light: require('../../assets/design/reading/engraving-light.png'),
  dark: require('../../assets/design/reading/engraving-dark.png'),
};

export interface ReadingBookIllustrationProps {
  /** card — 96×64 в карточке; thumb — 78×52 в компактной строке; header — 236 в шапке; headerCompact — 108×72. */
  placement?: 'card' | 'thumb' | 'header' | 'headerCompact';
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
  card: { width: 96 },
  thumb: { width: 78 },
  header: { width: 236 },
  headerCompact: { width: 108 },
  artwork: { width: '100%', height: '100%' },
});
