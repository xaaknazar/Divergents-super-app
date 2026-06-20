// Screen scaffold: themed bg + Aurora backdrop + safe-area inset, with an
// optional collapsing blurred header that fades in on scroll (iOS large-title style).
import React, { useRef } from 'react';
import { View, ScrollView, Animated, StyleProp, ViewStyle, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ty } from '../theme/tokens';
import { Aurora } from './Aurora';

export function Screen({
  children, bg, scroll = true, tabPadding = true, contentStyle, topInset = true, gradient, aurora = true, largeTitle,
}: {
  children: React.ReactNode;
  bg?: string;
  scroll?: boolean;
  tabPadding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  topInset?: boolean;
  gradient?: string[];
  aurora?: boolean;
  largeTitle?: string;
}) {
  const { T, isDark } = useTheme();
  const _bg = bg ?? T.groupedBg;
  const insets = useSafeAreaInsets();
  const top = topInset ? insets.top : 0;
  const bottom = tabPadding ? insets.bottom + 64 : insets.bottom;
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({ inputRange: [44, 92], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={{ flex: 1, backgroundColor: _bg }}>
      {aurora ? <Aurora /> : null}

      {scroll ? (
        <Animated.ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={[{ paddingTop: top, paddingBottom: bottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: top }}>{children}</View>
      )}

      {/* Collapsing compact header */}
      {largeTitle && scroll ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: headerOpacity }}>
          <BlurView intensity={70} tint={isDark ? 'dark' : 'light'} style={{
            paddingTop: insets.top, height: insets.top + 46, justifyContent: 'flex-end',
            borderBottomWidth: 0.5, borderBottomColor: T.separator,
            backgroundColor: isDark ? 'rgba(18,22,33,0.62)' : 'rgba(249,249,249,0.62)',
          }}>
            <Text numberOfLines={1} style={[ty.headline, { color: T.label, textAlign: 'center', paddingBottom: 11, paddingHorizontal: 48 }]}>{largeTitle}</Text>
          </BlurView>
        </Animated.View>
      ) : null}
    </View>
  );
}
