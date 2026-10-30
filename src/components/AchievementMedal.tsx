import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import type { EarnedBadge } from '../data/achievementCatalog';

const METALS = { 1: ['#EEE0D4', '#A96D49'], 2: ['#F0F3F6', '#7F929F'], 3: ['#FFF0BE', '#C49539'] } as const;

/** Decorative medal; the surrounding control provides the accessible label. */
export function AchievementMedal({ b, size: variant = 'regular' }: { b: EarnedBadge; size?: 'compact' | 'regular' | 'large' }) {
  const { T } = useTheme();
  const size = { compact: 48, regular: 66, large: 92 }[variant];
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <LinearGradient colors={b.earned ? METALS[b.tier] : [T.fillTertiary, T.fillTertiary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: 4 }}>
      <View style={{ flex: 1, borderRadius: size / 2, borderWidth: 1, borderColor: b.earned ? '#FFFFFF88' : T.separator, alignItems: 'center', justifyContent: 'center', backgroundColor: b.earned ? b.color : T.cardBg }}>
        <SF name={b.icon} size={size * 0.42} color={b.earned ? '#fff' : T.labelSecondary} />
      </View>
    </LinearGradient>
  </View>;
}
