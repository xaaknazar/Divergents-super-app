import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

/** Chrome floats above a full-height viewport. Its fading edge never clips the list. */
export function ScrollHeader({ children, height, onHeight, overCover = false }: {
  children: React.ReactNode; height: number; onHeight: (height: number) => void; overCover?: boolean;
}) {
  const { isDark, reduceTransparency, T } = useTheme();
  return <View pointerEvents="box-none" style={styles.overlay}>
    {!overCover ? <LinearGradient pointerEvents="none"
      colors={reduceTransparency ? [T.groupedBg, T.groupedBg, 'transparent'] : isDark
        ? ['rgba(10,14,24,0.88)', 'rgba(10,14,24,0.38)', 'rgba(10,14,24,0)']
        : ['rgba(238,243,250,0.90)', 'rgba(238,243,250,0.38)', 'rgba(238,243,250,0)']}
      locations={[0, 0.65, 1]} style={[styles.edge, { height: height + 24 }]} /> : null}
    <View testID="scroll-header-measure" pointerEvents="box-none" onLayout={event => onHeight(event.nativeEvent.layout.height)}>
      {children}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  edge: { position: 'absolute', top: 0, left: 0, right: 0 },
});
