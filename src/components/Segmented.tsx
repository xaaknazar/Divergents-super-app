import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius, space } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';

export function Segmented({
  items, value, onChange, leadingIcons,
}: { items: string[]; value: number; onChange?: (i: number) => void; leadingIcons?: (SFName | string)[] }) {
  const { T, ty, textScale = 1 } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale * textScale > 1.3 || (items.length > 3 && width < 400);
  return (
    <View testID="segmented-control" accessibilityRole="radiogroup" style={{ flexDirection: stacked ? 'column' : 'row', backgroundColor: T.fillTertiary, borderRadius: radius.md, borderCurve: 'continuous', padding: 2, minHeight: minTouch }}>
      {items.map((s, i) => {
        const on = i === value;
        return (
          <Pressable key={i} onPress={() => { hSelect(); onChange?.(i); }} accessibilityRole="radio"
            disabled={!onChange} accessibilityLabel={s} accessibilityState={{ checked: on, selected: on, disabled: !onChange }} style={({ pressed }) => ({
            flex: stacked ? undefined : 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1,
            minHeight: minTouch, paddingVertical: 8, paddingHorizontal: space.xs, backgroundColor: on ? T.systemBg : 'transparent', borderRadius: radius.sm,
            borderCurve: 'continuous',
            ...(on ? { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
          })}>
            {leadingIcons ? <SF name={leadingIcons[i]} size={12} color={T.label} /> : null}
            <Text style={[ty.footnoteEm, { color: T.label, flexShrink: 1, textAlign: 'center' }]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
