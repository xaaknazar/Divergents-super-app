// Плитка быстрого доступа для сетки в 2 колонки (handoff 2026-10-20, §4.4):
// белый блок, цветная IconTile, необязательный счётчик цвета тона, заголовок и подпись.
import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { nums,shadows } from '../theme/tokens';
import { IconTile,IconTileTone,iconTileInk } from './IconTile';
import { PressableScale } from './PressableScale';
import { SFName } from './SFIcon';

export interface ShortcutTileProps {
  icon: SFName;
  tone?: Extract<IconTileTone, 'brand' | 'violet' | 'orange' | 'trip' | 'pink'>;
  title: string;
  caption?: string;
  count?: number | null;
  onPress: () => void;
}

export function ShortcutTile({ icon, tone = 'brand', title, caption, count, onPress }: ShortcutTileProps) {
  const { T, ty, isDark } = useTheme();
  const hasCount = count != null;
  return <PressableScale fill onPress={onPress} accessibilityLabel={[title, hasCount ? String(count) : null, caption].filter(Boolean).join(', ')}>
    <View style={[styles.tile, { backgroundColor: T.cardBg }, isDark ? null : shadows.tappable]}>
      <View style={styles.head}>
        <IconTile icon={icon} tone={tone} size="sm" />
        {hasCount ? <Text style={[ty.title3, nums, { color: iconTileInk(tone, isDark) }]}>{count}</Text> : null}
      </View>
      <View style={styles.text}>
        <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{title}</Text>
        {caption ? <Text style={[ty.footnote, { color: T.labelSecondary }]} numberOfLines={2}>{caption}</Text> : null}
      </View>
    </View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: 14, borderCurve: 'continuous', paddingTop: 14, paddingHorizontal: 14, paddingBottom: 13, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { gap: 2, minWidth: 0 },
});
