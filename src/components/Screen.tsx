// Screen scaffold: grouped background + safe-area top inset. Use `scroll` for
// scrolling content; bottom padding leaves room for the floating tab bar.
import React from 'react';
import { View, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme/tokens';

export function Screen({
  children, bg = T.groupedBg, scroll = true, tabPadding = true, contentStyle, topInset = true,
}: {
  children: React.ReactNode;
  bg?: string;
  scroll?: boolean;
  tabPadding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const top = topInset ? insets.top : 0;
  const bottom = tabPadding ? insets.bottom + 64 : insets.bottom;

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: top }}>{children}</View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingTop: top, paddingBottom: bottom }, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}
