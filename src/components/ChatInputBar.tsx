import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabDockContentInset, tabDockMiniPlayerHeight } from '../lib/tabDockLayout';
import { useOptionalAudioTrack } from '../state/audioPlayerValue';
import { useTheme } from '../theme/ThemeContext';
import { BottomFade } from './BottomFade';

/** Messages continue behind the fade; the measured inset keeps the last reply reachable. */
export function ChatInputBar({ children, keyboardVisible = false, onHeightChange }: {
  children: React.ReactNode; keyboardVisible?: boolean; onHeightChange?: (height: number) => void;
}) {
  const { ty } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const audioTrack = useOptionalAudioTrack();
  const dockInset = tabDockContentInset(bottom, audioTrack
    ? tabDockMiniPlayerHeight(ty.footnoteEm.lineHeight ?? 18, ty.caption2.lineHeight ?? 14, fontScale) : 0);
  return <View testID="chat-input-bar" onLayout={event => onHeightChange?.(event.nativeEvent.layout.height)}
    style={[styles.bar, { paddingBottom: keyboardVisible ? 10 : dockInset }]}>
    <BottomFade placement="composer" />
    {children}
  </View>;
}
const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8 },
});
