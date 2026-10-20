// TappableSurface — белый блок-ссылка с единой «мягкой» тенью (handoff 2026-10-20, §2.4).
// Тень живёт на внешнем слое, обрезка (overflow) — на внутреннем: на iOS тень с
// overflow: hidden на одном View не рисуется. Радиус 14. Вся поверхность — одна кнопка.
import React from 'react';
import { Pressable,StyleSheet,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { shadows } from '../theme/tokens';

export function TappableSurface({ children, onPress, accessibilityLabel, accessibilityHint }: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}) {
  const { T, isDark } = useTheme();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}
    style={({ pressed }) => [styles.shadow, shadows.tappable, { backgroundColor: T.cardBg, opacity: pressed ? 0.88 : 1 }]}>
    <View style={[styles.clip, isDark ? { borderWidth: 0.5, borderColor: T.cardBorder } : null]}>{children}</View>
  </Pressable>;
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 14, borderCurve: 'continuous' },
  clip: { borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden' },
});
