import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Обложка из фото канала: весь оригинал виден, независимо от его пропорций. */
export function CommunityChannelCover({ uri }: { uri: string }) {
  const { T } = useTheme();
  return <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none"
    style={[styles.frame, { backgroundColor: T.fillSecondary }]}>
    <Image source={{ uri }} recyclingKey={uri} style={[StyleSheet.absoluteFill, styles.backdrop]}
      contentFit="cover" contentPosition="center" blurRadius={24} cachePolicy="memory-disk" />
    <Image source={{ uri }} recyclingKey={uri} style={styles.image}
      contentFit="contain" contentPosition="center" cachePolicy="memory-disk" />
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden' },
  backdrop: { opacity: 0.3 },
  image: { width: '100%', height: '100%' },
});
