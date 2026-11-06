import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { hTap } from '../lib/haptics';
import { SF } from './SFIcon';

export interface LessonActionsProps {
  state: 'ready' | 'completed' | 'locked';
  next: 'lesson' | 'course';
  onContinue: () => void;
}

/** One aligned action row; completion is a status, not a disabled action. */
export function LessonActions({ state, next, onContinue }: LessonActionsProps) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(width - insets.left - insets.right - 32);
  const stacked = availableWidth < 320 || (ty.subheadEm.fontSize ?? 16) * fontScale > 20;
  const label = state === 'ready' ? 'Завершить урок'
    : state === 'locked' || next === 'course' ? 'К программе курса' : 'Следующий урок';
  const icon = state === 'ready' ? 'checkmark'
    : state === 'locked' || next === 'course' ? 'chevron.left' : 'arrow.right';
  const tinted = state === 'locked';
  const ink = tinted ? T.brandText : T.onBrand;

  return <View style={[styles.panel, { paddingBottom: insets.bottom + 12,
    paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right),
    backgroundColor: T.cardBg, borderTopColor: T.separator }]}>
    <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}
      style={[styles.actions, stacked && styles.stacked]}>
      {state === 'completed' ? (
        <View accessible accessibilityRole="text" accessibilityLabel={tr('Урок пройден')}
          style={[styles.slot, !stacked && styles.paired, { backgroundColor: T.brandTinted }]}>
          <SF name="checkmark" size={18} color={T.brandText} />
          <Text style={[ty.subheadEm, styles.label, { color: T.brandText }]}>{tr('Урок пройден')}</Text>
        </View>
      ) : null}
      <Pressable onPress={() => { hTap(); onContinue(); }} accessibilityRole="button" accessibilityLabel={tr(label)}
        style={({ pressed }) => [styles.slot, !stacked && styles.paired,
          { backgroundColor: tinted ? T.brandTinted : T.brand, opacity: pressed ? 0.8 : 1 }]}>
        <SF name={icon} size={18} color={ink} />
        <Text style={[ty.subheadEm, styles.label, { color: ink }]}>{tr(label)}</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  stacked: { flexDirection: 'column' },
  paired: { flex: 1 },
  slot: { minHeight: 56, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { flexShrink: 1, textAlign: 'center' },
});
