import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius,shadows } from '../theme/tokens';

export interface ContentBlockProps {
  children: React.ReactNode;
  size?: 'regular' | 'compact' | 'flush';
  elevated?: boolean;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
}

/** Grouped content surface. Placement belongs to Wrapper; appearance cannot be overridden. */
export function ContentBlock({ children, size = 'regular', elevated = false, accessibilityLiveRegion }: ContentBlockProps) {
  const { T } = useTheme();
  return <View accessibilityLiveRegion={accessibilityLiveRegion} style={{
    backgroundColor: T.cardBg, borderRadius: radius.block, borderCurve: 'continuous',
    borderWidth: elevated ? 0 : 0.5, borderColor: T.cardBorder,
    ...(elevated ? shadows.floating : {}),
  }}><View style={{ borderRadius: radius.block, borderCurve: 'continuous', overflow: 'hidden',
    padding: size === 'flush' ? 0 : size === 'compact' ? 14 : 18,
  }}>{children}</View></View>;
}
