// Screen scaffold: themed bg + Aurora backdrop + safe-area inset, with an
// optional collapsing blurred header that fades in on scroll (iOS large-title style).
import React, { useRef, useState } from 'react';
import { View, Animated, RefreshControl, Text, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Aurora } from './Aurora';
import { tabDockContentInset, tabDockMiniPlayerHeight } from '../lib/tabDockLayout';
import { useOptionalAudioTrack } from '../state/audioPlayerValue';

export interface ScreenProps {
  children: React.ReactNode;
  surface?: 'grouped' | 'transparent';
  scroll?: boolean;
  tabPadding?: boolean;
  topInset?: boolean;
  bottomInset?: boolean;
  aurora?: boolean;
  largeTitle?: string;
  onRefresh?: () => void | Promise<void>;
  keyboardAware?: boolean;
}

export function Screen({ children, surface = 'grouped', scroll = true, tabPadding = true,
  topInset = true, bottomInset = true, aurora = true, largeTitle, onRefresh, keyboardAware = false }: ScreenProps) {
  const { T, isDark, reduceTransparency, ty } = useTheme();
  const background = surface === 'transparent' ? 'transparent' : T.groupedBg;
  const insets = useSafeAreaInsets();
  const top = topInset ? insets.top : 0;
  const { fontScale } = useWindowDimensions();
  const audioTrack = useOptionalAudioTrack();
  const playerHeight = audioTrack ? tabDockMiniPlayerHeight(ty.footnoteEm.lineHeight ?? 18, ty.caption2.lineHeight ?? 14, fontScale) : 0;
  const bottom = tabPadding ? tabDockContentInset(bottomInset ? insets.bottom : 0, playerHeight) : bottomInset ? insets.bottom : 0;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = async () => { if (!onRefresh) return; setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } };

  const headerOpacity = scrollY.interpolate({ inputRange: [44, 92], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <KeyboardAvoidingView enabled={keyboardAware} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: background }}>
      {aurora ? <Aurora /> : null}

      {scroll ? (
        <Animated.ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={T.brand} /> : undefined}
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: top }}>{children}</View>
      )}

      {/* Collapsing compact header */}
      {largeTitle && scroll ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: headerOpacity }}>
          {reduceTransparency ? (
            // Reduce Transparency: opaque header instead of the frosted blur.
            <View style={{
              paddingTop: insets.top, height: insets.top + 46, justifyContent: 'flex-end',
              borderBottomWidth: 0.5, borderBottomColor: T.separator, backgroundColor: T.cardBg,
            }}>
              <Text numberOfLines={1} style={[ty.headline, { color: T.label, textAlign: 'center', paddingBottom: 11, paddingHorizontal: 48 }]}>{largeTitle}</Text>
            </View>
          ) : (
            <BlurView intensity={70} tint={isDark ? 'dark' : 'light'} style={{
              paddingTop: insets.top, height: insets.top + 46, justifyContent: 'flex-end',
              borderBottomWidth: 0.5, borderBottomColor: T.separator,
              backgroundColor: isDark ? 'rgba(18,22,33,0.62)' : 'rgba(249,249,249,0.62)',
            }}>
              <Text numberOfLines={1} style={[ty.headline, { color: T.label, textAlign: 'center', paddingBottom: 11, paddingHorizontal: 48 }]}>{largeTitle}</Text>
            </BlurView>
          )}
        </Animated.View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
