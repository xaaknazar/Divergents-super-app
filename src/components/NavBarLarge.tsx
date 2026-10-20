import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Шапка корневого экрана вкладки: крупный заголовок, подзаголовок, действия и кнопка профиля справа. */
export function NavBarLarge({ title, subtitle, trailing }: { title: string; subtitle?: string | null; trailing?: React.ReactNode }) {
  const { T, ty, textScale = 1 } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale * textScale > 1.3 || width < 350;
  return (
    <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', justifyContent: 'space-between', gap: 8, paddingLeft: 20, paddingRight: 16, paddingTop: 10, paddingBottom: 8, minHeight: 48 }}>
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text accessibilityRole="header" style={[ty.largeTitle, { color: T.label }]}>{title}</Text>
        {subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: stacked ? 'flex-end' : 'center' }}>{trailing}</View> : null}
    </View>
  );
}
