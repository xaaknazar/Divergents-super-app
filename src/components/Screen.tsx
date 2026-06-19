// Screen scaffold: themed background + subtle Aurora backdrop + safe-area inset.
import React from 'react';
import { View, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Aurora } from './Aurora';

export function Screen({
  children, bg, scroll = true, tabPadding = true, contentStyle, topInset = true, gradient, aurora = true,
}: {
  children: React.ReactNode;
  bg?: string;
  scroll?: boolean;
  tabPadding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  topInset?: boolean;
  gradient?: string[];
  aurora?: boolean;
}) {
  const { T } = useTheme();
  const _bg = bg ?? T.groupedBg;
  const insets = useSafeAreaInsets();
  const top = topInset ? insets.top : 0;
  const bottom = tabPadding ? insets.bottom + 64 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: _bg }}>
      {aurora ? <Aurora /> : null}
      {scroll ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={[{ paddingTop: top, paddingBottom: bottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: top }}>{children}</View>
      )}
    </View>
  );
}
