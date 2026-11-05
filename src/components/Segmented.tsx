import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius, space } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';
import { useGlassControl } from './ColorWash';

/**
 * Стеклянный переключатель как в iOS 26: прозрачная дорожка с тонким бликом и
 * стеклянный ползунок, без серой и без цветной заливки.
 * `glass` — для цветного фона (как в Apple Sports): прозрачное стекло, белые подписи.
 */
export function Segmented({
  items, value, onChange, leadingIcons, variant = 'standard',
}: { items: string[]; value: number; onChange?: (i: number) => void; leadingIcons?: (SFName | string)[]; variant?: 'standard' | 'glass' }) {
  const { T, ty, isDark, textScale = 1 } = useTheme();
  const glass = variant === 'glass';
  const { track, trackRim, thumb, thumbRim, onInk, offInk } = useGlassControl(glass);
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale * textScale > 1.3 || (items.length > 3 && width < 400);
  return (
    <View testID="segmented-control" accessibilityRole="radiogroup" style={{ flexDirection: stacked ? 'column' : 'row', backgroundColor: track, borderRadius: stacked ? radius.lg : radius.pill, borderCurve: 'continuous', padding: 3, minHeight: minTouch,
      borderWidth: 0.5, borderColor: trackRim }}>
      {items.map((s, i) => {
        const on = i === value;
        return (
          <Pressable key={i} onPress={() => { hSelect(); onChange?.(i); }} accessibilityRole="radio"
            disabled={!onChange} accessibilityLabel={s} accessibilityState={{ checked: on, selected: on, disabled: !onChange }} style={({ pressed }) => ({
            flex: stacked ? undefined : 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1,
            minHeight: minTouch, paddingVertical: 8, paddingHorizontal: space.xs, backgroundColor: on ? thumb : 'transparent', borderRadius: stacked ? radius.md : radius.pill,
            borderCurve: 'continuous',
            ...(on ? { borderWidth: 0.5, borderColor: thumbRim, shadowColor: '#000', shadowOpacity: isDark || glass ? 0.18 : 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : null),
          })}>
            {leadingIcons ? <SF name={leadingIcons[i]} size={12} color={on ? onInk : offInk} /> : null}
            <Text style={[on ? ty.footnoteEm : ty.footnote, { color: on ? onInk : offInk, flexShrink: 1, textAlign: 'center' }]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
