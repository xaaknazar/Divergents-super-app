import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** An author's image stays whole, including portrait artwork and embedded type. */
export function ChannelArtwork({ uri, name, size = 'card' }: {
  uri?: string | null; name: string; size?: 'navigation' | 'compact' | 'card' | 'hero';
}) {
  const { T, ty } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const image = uri && uri !== failedUri;
  return <View accessible={false} importantForAccessibility="no-hide-descendants"
    style={[styles.frame, styles[size], { backgroundColor: T.brandTinted }]}>
    {image ? <>
      <Image source={{ uri }} recyclingKey={`back:${uri}`} style={[StyleSheet.absoluteFill, styles.backdrop]}
        contentFit="cover" blurRadius={24} cachePolicy="memory-disk" />
      <Image source={{ uri }} recyclingKey={uri} style={styles.image} contentFit="contain"
        cachePolicy="memory-disk" onError={() => setFailedUri(uri)} />
    </> : <Text style={[(size === 'compact' || size === 'navigation') ? ty.title2 : ty.largeTitle, { color: T.brandText }]}>
      {(name.trim()[0] || 'К').toUpperCase()}
    </Text>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  navigation: { width: 44, height: 44, borderRadius: 22 },
  compact: { width: 60, height: 60, borderRadius: 30 },
  card: { width: 112, height: 112, borderRadius: 56 },
  hero: { width: 112, height: 112, borderRadius: 56 },
  image: { width: '100%', height: '100%' }, backdrop: { opacity: 0.25 },
});
