import React, { useState } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { bookCoverSource } from '../lib/bookCoverSource';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

export function BookCover({ imageUrl, size = 'tile', onLoadError }: { imageUrl?: string | null; size?: 'tile' | 'detail'; onLoadError?: () => void }) {
  const { T, reduceMotion } = useTheme();
  const [broken, setBroken] = useState<string | null>(null);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: size === 'detail' ? 120 : '100%', aspectRatio: 0.68, borderRadius: 12,
      backgroundColor: T.fillTertiary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    {imageUrl && imageUrl !== broken ? <Image source={bookCoverSource(imageUrl, size === 'detail' ? 600 : 320)} onError={() => { setBroken(imageUrl); onLoadError?.(); }}
      contentFit="cover" transition={reduceMotion ? 0 : 150} cachePolicy="memory-disk" style={{ width: '100%', height: '100%' }} />
      : <SF name="book.fill" size={size === 'detail' ? 48 : 30} color={T.labelTertiary} />}
  </View>;
}
