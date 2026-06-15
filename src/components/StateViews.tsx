// Unified loading / empty / error states — theme-aware.
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { ty } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedShimmer } from './_shimmer';
import { SF, SFName } from './SFIcon';
import { PrimaryButton } from './ui';

// ── Shimmer block ────────────────────────────────────────────────────────
export function Skeleton({
  w = '100%', h = 14, radius = 8, style,
}: { w?: DimensionValue; h?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { T } = useTheme();
  const opacity = useThemedShimmer();
  return (
    <Animated.View style={[{ width: w, height: h, borderRadius: radius, backgroundColor: T.fillSecondary, opacity }, style]} />
  );
}

// One course-card placeholder
function CardSkeleton({ width }: { width: number }) {
  const { T } = useTheme();
  return (
    <View style={{ width, backgroundColor: T.cardBg, borderRadius: 16, overflow: 'hidden' }}>
      <Skeleton w="100%" h={110} radius={0} />
      <View style={{ padding: 12, gap: 8 }}>
        <Skeleton w="80%" h={13} />
        <Skeleton w="55%" h={11} />
        <Skeleton w="40%" h={11} />
      </View>
    </View>
  );
}

// 2-column grid of card skeletons
export function CourseGridSkeleton({ count = 4 }: { count?: number }) {
  const cardW = 168;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16, justifyContent: 'space-between' }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} width={cardW} />)}
    </View>
  );
}

// Horizontal list skeleton (rows)
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const { T } = useTheme();
  return (
    <View style={{ backgroundColor: T.cardBg, borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < rows - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
          <Skeleton w={40} h={40} radius={20} />
          <View style={{ flex: 1, gap: 7 }}>
            <Skeleton w="70%" h={13} />
            <Skeleton w="45%" h={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────
export function EmptyState({
  icon = 'tray', title, subtitle, actionLabel, onAction,
}: { icon?: SFName | string; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  const { T } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 40, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
        <SF name={icon} size={28} color={T.labelTertiary} />
      </View>
      <Text style={[ty.headline, { color: T.label, textAlign: 'center', marginTop: 4 }]}>{title}</Text>
      {subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={{ marginTop: 14, paddingHorizontal: 28, alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}

// ── Error state ──────────────────────────────────────────────────────────
export function ErrorState({
  message = 'Не удалось загрузить данные. Проверьте подключение к интернету.', onRetry,
}: { message?: string; onRetry?: () => void }) {
  const { T } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 40, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,59,48,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <SF name="wifi.slash" size={28} color={T.red} />
      </View>
      <Text style={[ty.headline, { color: T.label, textAlign: 'center', marginTop: 4 }]}>Ошибка сети</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{message}</Text>
      {onRetry ? (
        <PrimaryButton label="Повторить" icon="arrow.clockwise" onPress={onRetry} style={{ marginTop: 14, paddingHorizontal: 28, alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}
