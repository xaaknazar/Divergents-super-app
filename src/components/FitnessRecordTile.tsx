// Плитка рекорда на «Мои тренировки» (handoff 2026-10-20, §5a): IconTile solid 36, значение, подпись.
import React from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { IconTile,IconTileTone } from './IconTile';
import { SF,SFName } from './SFIcon';

export interface FitnessRecordTileProps {
  icon: SFName;
  tone: IconTileTone;
  value: string;
  label: string;
  caption?: string;
  /** Открыть тренировку рекорда; без него плитка не нажимается. */
  onPress?: () => void;
  onShare: () => void;
}

export function FitnessRecordTile({ icon, tone, value, label, caption, onPress, onShare }: FitnessRecordTileProps) {
  const { T, ty } = useTheme();
  return <Pressable onPress={onPress} onLongPress={onShare} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}
    style={({ pressed }) => [styles.tile, { backgroundColor: T.cardBg, opacity: pressed ? 0.8 : 1 }]}>
    <View style={styles.head}>
      <IconTile icon={icon} tone={tone} size="sm" />
      <Pressable onPress={onShare} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Поделиться')}>
        <SF name="square.and.arrow.up" size={15} color={T.labelTertiary} />
      </Pressable>
    </View>
    <Text style={[ty.title2, nums, { color: T.label, marginTop: 10 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    <Text style={[ty.caption1, { color: T.label, marginTop: 2 }]} numberOfLines={1}>{label}</Text>
    {caption ? <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{caption}</Text> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  tile: { borderRadius: 18, borderCurve: 'continuous', padding: 14, minHeight: 124 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
