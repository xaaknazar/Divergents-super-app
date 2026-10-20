import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function NavBarLarge({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  const { T, ty, textScale = 1 } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale * textScale > 1.3 || width < 350;
  return (
    <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, minHeight: 48 }}>
      <Text accessibilityRole="header" style={[ty.largeTitle, { color: T.label, flexShrink: 1 }]}>{title}</Text>
      {trailing ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-end' }}>{trailing}</View> : null}
    </View>
  );
}
