import React from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { shadows } from '../theme/tokens';
import type { Badge } from '../data/achievementCatalog';
import { AchievementMedal } from './AchievementMedal';
import { SF } from './SFIcon';

export function AchievementNotice({ badge, count, onOpen, onClose }: { badge: Badge; count: number; onOpen: () => void; onClose: () => void }) {
  const { T, ty } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gutter = Math.max(16, (width - 600) / 2);
  return <View style={{ position: 'absolute', top: insets.top + 56, left: gutter, right: gutter, borderRadius: 16,
    backgroundColor: T.cardBg, flexDirection: 'row', gap: 8, padding: 8, ...shadows.floating }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Новое достижение: ${badge.title}${count > 1 ? `. Ещё наград: ${count - 1}` : ''}. Открыть коллекцию`}
      onPress={onOpen} style={({ pressed }) => ({ flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, opacity: pressed ? 0.65 : 1 })}>
      <AchievementMedal b={{ ...badge, earned: true, progress: 1, value: badge.goal }} size="compact" />
      <View style={{ flex: 1, gap: 4 }}><Text style={[ty.headline, { color: T.label }]}>{badge.title}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{count > 1 ? `Новых достижений: ${count}` : 'Новое достижение'} · Открыть</Text></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Закрыть уведомление о достижении" onPress={onClose}
      style={({ pressed }) => ({ width: 48, minHeight: 48, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? T.fillTertiary : T.fillQuaternary })}>
      <SF name="xmark" size={16} color={T.labelSecondary} />
    </Pressable>
  </View>;
}
