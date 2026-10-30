import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

/** Баннер стартовой акции на главной Обучения. «Скачанные» и «Библиотека» — плитки ShortcutTile. */
export type LearningShortcutProps = { kind: 'gift'; subtitle: string; onPress: () => void };

export function LearningShortcut({ subtitle, onPress }: LearningShortcutProps) {
  const { T, ty } = useTheme();
  const title = 'Подарок новым участникам';
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`}
    style={({ pressed }) => ({ borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden', opacity: pressed ? 0.7 : 1 })}>
    <LinearGradient colors={[T.brandTintedStrong, T.brandTinted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 46, height: 46, borderRadius: 13, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
        <SF name="gift.fill" size={23} color={T.onBrand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ty.headline, { color: T.label }]}>{title}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 1 }]}>{subtitle}</Text>
      </View>
      <SF name="chevron.right" size={15} color={T.labelTertiary} />
    </LinearGradient>
  </Pressable>;
}
