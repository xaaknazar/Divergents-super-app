import React from 'react';
import { Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useThemedShimmer } from './_shimmer';

export interface SkeletonProps { variant?: 'cover' | 'title' | 'body' | 'avatar' }
export function Skeleton({ variant = 'body' }: SkeletonProps) {
  const { T } = useTheme();
  const opacity = useThemedShimmer();
  const avatar = variant === 'avatar';
  const height = { cover: 110, title: 13, body: 11, avatar: 40 }[variant];
  return <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: avatar ? 40 : '100%', height, borderRadius: avatar ? 20 : variant === 'cover' ? 0 : 8,
      borderCurve: 'continuous', backgroundColor: T.fillSecondary, opacity }} />;
}
