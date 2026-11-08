import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { hSelect } from '../lib/haptics';

/** Progress presets own their compact geometry: percentage labels never wrap.
 * Large text wraps whole controls into another row instead of splitting digits. */
export function BookProgressPicker({ value, disabled = false, onChange }: {
  value: number; disabled?: boolean; onChange: (value: number) => void;
}) {
  const { T, ty, textScale = 1 } = useTheme();
  const { fontScale } = useWindowDimensions();
  const minWidth = 44 * Math.max(1, fontScale * textScale);
  return <View style={styles.row}>
    {[0, 25, 50, 75, 100].map(progress => {
      const selected = progress === value;
      return <Pressable key={progress} accessibilityRole="button" accessibilityLabel={`${progress}%`}
        accessibilityState={{ selected, disabled }} disabled={disabled}
        onPress={() => { hSelect(); onChange(progress); }}
        style={({ pressed }) => [styles.option, { minWidth, backgroundColor: selected ? T.brandTinted : T.fillQuaternary,
          borderColor: selected ? T.brandText : 'transparent', opacity: disabled ? 0.45 : pressed ? 0.65 : 1 }]}>
        <Text numberOfLines={1} style={[ty.footnoteEm, styles.label, { color: selected ? T.brandText : T.labelSecondary }]}>{progress}%</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  option: { flexGrow: 1, flexBasis: 0, minHeight: 48, paddingHorizontal: space.xs, paddingVertical: space.sm,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1 },
  label: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
