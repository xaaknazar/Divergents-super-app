import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { bookCoverSource } from '../lib/bookCoverSource';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

/** Обложка книги в списках: картинка или значок книги на спокойном фоне. */
export function BookThumb({ uri, size = 'regular' }: { uri?: string | null; size?: 'small' | 'regular' }) {
  const { T } = useTheme();
  const box = size === 'small' ? styles.small : styles.regular;
  const source = bookCoverSource(uri, 120);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {source ? <Image source={source} style={[box, { backgroundColor: T.fillTertiary }]} contentFit="cover" cachePolicy="memory-disk" />
      : <View style={[box, styles.placeholder, { backgroundColor: T.fillTertiary }]}><SF name="book.fill" size={size === 'small' ? 14 : 16} color={T.labelTertiary} /></View>}
  </View>;
}
const styles = StyleSheet.create({
  regular: { width: 34, height: 50, borderRadius: 6, borderCurve: 'continuous' },
  small: { width: 28, height: 40, borderRadius: 5, borderCurve: 'continuous' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
