import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ScrollHeader } from './ScrollHeader';

/** For virtualized lists and forms that own their scroll/keyboard behavior. */
export function ScrollHeaderLayout({ header, children }: {
  header: React.ReactNode; children: (headerHeight: number) => React.ReactNode;
}) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(insets.top + 72);
  return <View style={[styles.root, { backgroundColor: T.groupedBg }]}>
    {children(height)}
    <ScrollHeader height={height} onHeight={setHeight}>{header}</ScrollHeader>
  </View>;
}

/** Adds navigation clearance inside the content, never above the scroll viewport. */
export function scrollHeaderContentInset(height: number, layout?: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  const existing = StyleSheet.flatten(layout) ?? {};
  const padding = existing.paddingTop ?? existing.paddingVertical ?? existing.padding ?? 0;
  return [layout, { paddingTop: height + (typeof padding === 'number' ? padding : 0) }];
}
const styles = StyleSheet.create({ root: { flex: 1 } });
