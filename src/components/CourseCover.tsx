import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { SF, SFName } from './SFIcon';
import { imgUrl } from '../data/api';

export interface CourseCoverProps {
  imageUrl?: string | null;
  icon: SFName;
  variant?: 'card' | 'featured' | 'thumbnail';
}
export function CourseCover({ imageUrl, icon, variant = 'card' }: CourseCoverProps) {
  const { T, reduceMotion } = useTheme();
  return <View style={{ ...(variant === 'thumbnail' ? { width: 80, height: 80, borderRadius: 12, overflow: 'hidden' as const }
    : { width: '100%' as const, ...(variant === 'featured' ? { height: 180 } : { aspectRatio: 16 / 9 }) }),
    backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
    {imageUrl ? <Image source={imgUrl(imageUrl, 640)} style={{ width: '100%', height: '100%' }}
      contentFit="cover" transition={reduceMotion ? 0 : 200} cachePolicy="memory-disk" />
      : <SF name={icon} size={36} color={T.brandText} />}
  </View>;
}
