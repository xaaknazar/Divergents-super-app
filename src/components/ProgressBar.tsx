import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface ProgressBarProps {
  value?: number;
  tone?: 'brand' | 'success';
  size?: 'thin' | 'regular' | 'prominent';
  accessibilityLabel?: string;
}

/** A bounded, accessible progress indicator; appearance is owned here. */
export function ProgressBar({ value = 0.5, tone = 'brand', size = 'regular',
  accessibilityLabel = 'Прогресс' }: ProgressBarProps) {
  const { T } = useTheme();
  const height = { thin: 3, regular: 4, prominent: 6 }[size];
  const normalized = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(normalized * 100);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
    accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
    style={{ height, backgroundColor: T.fillTertiary, borderRadius: height, borderCurve: 'continuous', overflow: 'hidden' }}>
    <View style={{ width: `${normalized * 100}%`, height: '100%',
      backgroundColor: tone === 'success' ? T.greenText : T.brandText,
      borderRadius: height, borderCurve: 'continuous' }} />
  </View>;
}
