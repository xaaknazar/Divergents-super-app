import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export function BottomBar({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ backgroundColor: T.cardBg, borderTopWidth: 1, borderTopColor: T.cardBorder,
    paddingTop: 12, paddingBottom: insets.bottom + 12, paddingLeft: Math.max(insets.left, 16), paddingRight: Math.max(insets.right, 16) }}>
    <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', gap: 8 }}>{children}</View>
  </View>;
}
