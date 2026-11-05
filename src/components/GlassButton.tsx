// Круглая стеклянная кнопка-иконка, как в iOS 26: «назад», «закрыть», «поделиться», меню.
// Глиф — цвета текста (монохромный, как у Apple); `prominent` — главное действие на цветном
// стекле бренда с белым глифом (например, «Готово»).
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { hSelect } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { GlassSurface } from './GlassSurface';
import { SF } from './SFIcon';

export function GlassButton({ icon, onPress, onLongPress, label, prominent = false, scheme, badge, size = minTouch }: {
  icon: string; onPress?: () => void; onLongPress?: () => void;
  /** Подпись для VoiceOver: у иконки нет текста. */
  label: string;
  prominent?: boolean;
  /** Поверх фото — 'dark'. По умолчанию — тема приложения. */
  scheme?: 'light' | 'dark';
  badge?: number;
  size?: number;
}) {
  const { T, ty, isDark } = useTheme();
  const dark = scheme ? scheme === 'dark' : isDark;
  const glyph = prominent ? '#FFFFFF' : dark ? '#FFFFFF' : T.label;
  return <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} onLongPress={onLongPress} disabled={!onPress}
    accessibilityRole="button" accessibilityLabel={badge ? `${label}. ${badge}` : label} accessibilityState={{ disabled: !onPress }}
    hitSlop={Math.max(0, (minTouch - size) / 2)}
    style={({ pressed }) => ({ opacity: !onPress ? 0.45 : pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
    <GlassSurface interactive tint={prominent ? T.brand : undefined} scheme={scheme} style={{ width: size, height: size, borderRadius: size / 2 }}>
      <SF name={icon} size={Math.round(size * 0.42)} color={glyph} />
    </GlassSurface>
    {badge ? <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: T.brand,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: T.groupedBg }}>
      <Text allowFontScaling={false} style={[ty.caption2Em, { color: T.onBrand }]}>{badge > 99 ? '99+' : badge}</Text>
    </View> : null}
  </Pressable>;
}
