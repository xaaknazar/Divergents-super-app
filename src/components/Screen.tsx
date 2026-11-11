// Screen scaffold: themed bg + Aurora backdrop + safe-area inset, with an
// optional collapsing blurred header that fades in on scroll (iOS large-title style).
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, ScrollView, RefreshControl, Text, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ScrollHeader } from './ScrollHeader';
import { Aurora } from './Aurora';
import { HeaderBackdrop, HeaderBackdropMotif } from './HeaderBackdrop';
import { ColorWash } from './ColorWash';
import { tabDockContentInset, tabDockMiniPlayerHeight } from '../lib/tabDockLayout';
import { useTabScrollToTop } from '../state/useTabScrollToTop';
import { useOptionalAudioTrack } from '../state/audioPlayerValue';

export interface ScreenProps {
  children: React.ReactNode;
  /** Fixed navigation floats above the scroll viewport instead of cutting it off. */
  header?: React.ReactNode;
  /** Full-bleed course artwork starts beneath the controls, without a top spacer. */
  headerOverCover?: boolean;
  refreshing?: boolean;
  surface?: 'grouped' | 'transparent';
  scroll?: boolean;
  tabPadding?: boolean;
  topInset?: boolean;
  bottomInset?: boolean;
  aurora?: boolean;
  /** Фон шапки корневого экрана вкладки. Заменяет «аврору», пока фон в персонализации —
   * «По акценту» (по умолчанию); выбранный человеком другой фон остаётся его выбором. */
  backdrop?: HeaderBackdropMotif;
  /** Цветной фон из «Персонализации» (ColorWash) вместо мотива шапки — пока только «Профиль». */
  wash?: 'soft' | 'strong';
  largeTitle?: string;
  onRefresh?: () => void | Promise<void>;
  keyboardAware?: boolean;
  /** A newly required action at the start of a screen must not remain above the viewport. */
  scrollResetKey?: string;
}

export function Screen({ children, surface = 'grouped', scroll = true, tabPadding = true,
  header, headerOverCover = false, refreshing: externalRefreshing = false, topInset = true, bottomInset = true, aurora = true, backdrop, wash, largeTitle, onRefresh, keyboardAware = false, scrollResetKey }: ScreenProps) {
  const { T, ty, background: backgroundPreset } = useTheme();
  const background = surface === 'transparent' ? 'transparent' : T.groupedBg;
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(insets.top + 72);
  const top = header && scroll ? headerOverCover ? 0 : headerHeight : topInset ? insets.top : 0;
  const { fontScale } = useWindowDimensions();
  const audioTrack = useOptionalAudioTrack();
  const playerHeight = audioTrack ? tabDockMiniPlayerHeight(ty.footnoteEm.lineHeight ?? 18, ty.caption2.lineHeight ?? 14, fontScale) : 0;
  const bottom = tabPadding ? tabDockContentInset(bottomInset ? insets.bottom : 0, playerHeight) : bottomInset ? insets.bottom : 0;
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop(scrollRef, scroll);
  useEffect(() => {
    if (scrollResetKey !== undefined) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollResetKey]);
  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = async () => { if (!onRefresh) return; setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } };

  const headerOpacity = scrollY.interpolate({ inputRange: [44, 92], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <KeyboardAvoidingView enabled={keyboardAware} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: background }}>
      {wash ? <ColorWash strength={wash} />
        : backdrop && (backgroundPreset ?? 'accent') === 'accent' ? <HeaderBackdrop motif={backdrop} />
        : aurora ? <Aurora /> : null}

      {scroll ? (
        <Animated.ScrollView
          ref={scrollRef}
          testID={header ? 'screen-fullscreen-scroll' : undefined}
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={header ? { top: headerHeight, bottom: insets.bottom } : undefined}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing || externalRefreshing} progressViewOffset={header ? headerHeight : undefined} onRefresh={doRefresh} tintColor={T.brand} /> : undefined}
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: top }}>{children}</View>
      )}

      {header && scroll ? <ScrollHeader height={headerHeight} onHeight={setHeaderHeight} overCover={headerOverCover}>{header}</ScrollHeader> : null}

      {/* Collapsing compact header */}
      {largeTitle && scroll ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: headerOpacity }}>
          <ScrollHeader height={insets.top + 46} onHeight={() => {}}>
            <View style={{ paddingTop: insets.top, height: insets.top + 46, justifyContent: 'flex-end' }}>
              <Text numberOfLines={1} style={[ty.headline, { color: T.label, textAlign: 'center', paddingBottom: 11, paddingHorizontal: 48 }]}>{largeTitle}</Text>
            </View>
          </ScrollHeader>
        </Animated.View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
