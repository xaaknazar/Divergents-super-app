import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius, space } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';
import { GlassSurface } from './GlassSurface';

/**
 * Переключатель из стекла, как в iOS 26: дорожка — стекло, выбранный пункт —
 * стеклянная «капля» поверх неё. На iOS 26 это настоящий Liquid Glass
 * (GlassView), на остальных — его запасной вид. Ни серой, ни цветной заливки.
 * `glass` — для цветного фона (как в Apple Sports): прозрачное стекло, белые подписи.
 */
export function Segmented({
  items, value, onChange, leadingIcons, variant = 'standard',
}: { items: string[]; value: number; onChange?: (i: number) => void; leadingIcons?: (SFName | string)[]; variant?: 'standard' | 'glass' }) {
  const { T, ty, isDark, textScale = 1 } = useTheme();
  const clear = variant === 'glass';
  const onInk = clear || isDark ? '#FFFFFF' : T.label;
  const offInk = clear || isDark ? 'rgba(255,255,255,0.86)' : T.label;
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale * textScale > 1.3 || (items.length > 3 && width < 400);
  const trackRadius = stacked ? radius.lg : radius.pill;
  const thumbRadius = stacked ? radius.md : radius.pill;
  return (
    <View testID="segmented-control" accessibilityRole="radiogroup" style={{ minHeight: minTouch, flexDirection: stacked ? 'column' : 'row' }}>
      <GlassSurface variant={clear ? 'clear' : 'regular'} style={{ flexGrow: 1, borderRadius: trackRadius, padding: 3, minHeight: minTouch,
        flexDirection: stacked ? 'column' : 'row', alignItems: 'stretch', justifyContent: 'flex-start' }}>
        {items.map((s, i) => {
          const on = i === value;
          return (
            <Pressable key={i} onPress={() => { hSelect(); onChange?.(i); }} accessibilityRole="radio"
              disabled={!onChange} accessibilityLabel={s} accessibilityState={{ checked: on, selected: on, disabled: !onChange }} style={({ pressed }) => ({
              flex: stacked ? undefined : 1, minHeight: minTouch, opacity: pressed ? 0.7 : 1, justifyContent: 'center',
            })}>
              {on ? <GlassSurface interactive variant={clear ? 'clear' : 'regular'}
                style={[StyleSheet.absoluteFill, { borderRadius: thumbRadius }]} /> : null}
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: space.xs }}>
                {leadingIcons ? <SF name={leadingIcons[i]} size={12} color={on ? onInk : offInk} /> : null}
                <Text style={[on ? ty.footnoteEm : ty.footnote, { color: on ? onInk : offInk, flexShrink: 1, textAlign: 'center' }]}>{s}</Text>
              </View>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}
