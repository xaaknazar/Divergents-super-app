import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius, space } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';
import { useWashGlass } from './ColorWash';

/**
 * Переключатель в цвете бренда, без серого: дорожка — лёгкий оттенок акцента,
 * ползунок — белый с текстом акцента (в тёмной теме — акцент с белым текстом).
 * `glass` — для цветного фона (как в Apple Sports): прозрачная белая дорожка,
 * белый ползунок, остальные подписи белые.
 */
export function Segmented({
  items, value, onChange, leadingIcons, variant = 'standard',
}: { items: string[]; value: number; onChange?: (i: number) => void; leadingIcons?: (SFName | string)[]; variant?: 'standard' | 'glass' }) {
  const { T, ty, isDark, textScale = 1 } = useTheme();
  const glass = variant === 'glass';
  const washGlass = useWashGlass();
  const track = glass ? washGlass ?? 'rgba(255,255,255,0.24)' : T.brandTinted;
  const thumb = glass ? '#FFFFFF' : isDark ? T.brand : '#FFFFFF';
  const onInk = glass ? '#234088' : isDark ? T.onBrand : T.brandText;
  const offInk = glass ? '#FFFFFF' : T.brandText;
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale * textScale > 1.3 || (items.length > 3 && width < 400);
  return (
    <View testID="segmented-control" accessibilityRole="radiogroup" style={{ flexDirection: stacked ? 'column' : 'row', backgroundColor: track, borderRadius: stacked ? radius.lg : radius.pill, borderCurve: 'continuous', padding: 3, minHeight: minTouch,
      ...(glass ? { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.35)' } : null) }}>
      {items.map((s, i) => {
        const on = i === value;
        return (
          <Pressable key={i} onPress={() => { hSelect(); onChange?.(i); }} accessibilityRole="radio"
            disabled={!onChange} accessibilityLabel={s} accessibilityState={{ checked: on, selected: on, disabled: !onChange }} style={({ pressed }) => ({
            flex: stacked ? undefined : 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1,
            minHeight: minTouch, paddingVertical: 8, paddingHorizontal: space.xs, backgroundColor: on ? thumb : 'transparent', borderRadius: stacked ? radius.md : radius.pill,
            borderCurve: 'continuous',
            ...(on ? { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
          })}>
            {leadingIcons ? <SF name={leadingIcons[i]} size={12} color={on ? onInk : offInk} /> : null}
            <Text style={[ty.footnoteEm, { color: on ? onInk : offInk, flexShrink: 1, textAlign: 'center' }]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
