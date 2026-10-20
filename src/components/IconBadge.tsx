import React from 'react';
import { View } from 'react-native';
import { SF, SFName } from './SFIcon';
import { useTheme } from '../theme/ThemeContext';
import { contrastForeground } from '../theme/personalization';

export type IconBadgeProps = {
  icon: SFName | string;
  tone?: 'brand' | 'success' | 'danger' | 'neutral';
} & ({
  variant?: 'solid' | 'tinted';
  shape?: 'circle' | 'squircle';
  size?: 'small' | 'regular' | 'large';
} | { variant: 'halo'; shape?: never; size?: never });
export function IconBadge({ icon, tone = 'brand', variant = 'solid', shape = 'circle', size = 'regular' }: IconBadgeProps) {
  const { T } = useTheme();
  const palette = {
    brand: { fill: T.brand, ink: T.brandText, onFill: T.onBrand, tint: T.brandTinted },
    success: { fill: T.green, ink: T.greenText, onFill: T.onGreen, tint: T.emeraldBadgeBg },
    danger: { fill: T.red, ink: T.redText, onFill: T.onRed, tint: 'rgba(255,59,48,0.14)' },
    neutral: { fill: T.labelSecondary, ink: T.labelSecondary, onFill: contrastForeground(T.labelSecondary), tint: T.fillTertiary },
  }[tone];
  const dimension = { small: 28, regular: 30, large: 36 }[size];
  if (variant === 'halo') {
    return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{
      width: 76, height: 76, borderRadius: 38, borderCurve: 'continuous', backgroundColor: T.fillTertiary,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, borderCurve: 'continuous', backgroundColor: T.fillTertiary,
        alignItems: 'center', justifyContent: 'center' }}>
        <SF name={icon} size={28} color={tone === 'neutral' ? T.labelTertiary : palette.ink} />
      </View>
    </View>;
  }
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{
    width: dimension, height: dimension, flexShrink: 0,
    borderRadius: dimension * (shape === 'circle' ? 0.5 : 0.22), borderCurve: 'continuous',
    backgroundColor: variant === 'solid' ? palette.fill : palette.tint,
    alignItems: 'center', justifyContent: 'center',
  }}><SF name={icon} size={Math.round(dimension * (shape === 'circle' ? 0.55 : 0.6))}
    color={variant === 'solid' ? palette.onFill : palette.ink} /></View>;
}
