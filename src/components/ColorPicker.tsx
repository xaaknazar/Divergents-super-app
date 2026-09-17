// Выбор любого цвета: пресеты, три ползунка (тон, насыщенность, светлота) и
// поле для hex. Без сторонних библиотек — ползунок это полоса с градиентом и
// PanResponder поверх неё.
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, PanResponder, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { hexToHsl, hslToHex, normalizeHex, isLight } from '../lib/color';
import { hSelect } from '../lib/haptics';

/** Пресеты под любые фото: белый и чёрный — на всё, синие — фирменные, тёплые — на тёмное. */
export const COLOR_PRESETS = ['#FFFFFF', '#000000', '#234088', '#3D5BDB', '#8AA0FF', '#FFD60A', '#FF9F0A', '#FF3B30', '#34C759', '#FF2D55'];

const HUES = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'];

function Slider({ value, max, onChange, colors, label, T, ty }: {
  value: number; max: number; onChange: (v: number) => void; colors: string[]; label: string; T: any; ty: any;
}) {
  const widthRef = useRef(1);
  const set = (x: number) => onChange(Math.min(max, Math.max(0, (x / widthRef.current) * max)));
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => set(e.nativeEvent.locationX),
    onPanResponderMove: (e) => set(e.nativeEvent.locationX),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [max, onChange]);
  const left = `${(value / max) * 100}%` as const;
  return (
    <View style={{ gap: 6 }}>
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>{label}</Text>
      <View
        {...pan.panHandlers}
        onLayout={(e: LayoutChangeEvent) => { widthRef.current = Math.max(1, e.nativeEvent.layout.width); }}
        style={{ height: 32, justifyContent: 'center' }}
        accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: Math.round(value) }}
      >
        <LinearGradient colors={colors as [string, string, ...string[]]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ height: 14, borderRadius: 7, borderCurve: 'continuous' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: left as `${number}%`, marginLeft: -11, width: 22, height: 22, borderRadius: 11, borderCurve: 'continuous', backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }} />
      </View>
    </View>
  );
}

export function ColorPicker({ value, onChange, presets = COLOR_PRESETS, extra }: {
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
  /** Особые варианты слева от пресетов (например, «фирменный» для знака). */
  extra?: React.ReactNode;
}) {
  const { T, ty } = useTheme();
  const hsl = useMemo(() => hexToHsl(value), [value]);
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  const update = (patch: Partial<typeof hsl>) => onChange(hslToHex({ ...hsl, ...patch }));
  const hueColor = hslToHex({ h: hsl.h, s: 100, l: 50 });

  return (
    <View style={{ gap: 14 }}>
      {/* Пресеты + текущий цвет */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {extra}
        {presets.map((c) => {
          const on = c.toUpperCase() === value.toUpperCase();
          return (
            <Pressable key={c} onPress={() => { hSelect(); onChange(c); }} accessibilityRole="button" accessibilityLabel={c} accessibilityState={{ selected: on }}
              style={{ width: 30, height: 30, borderRadius: 15, borderCurve: 'continuous', backgroundColor: c, borderWidth: on ? 3 : 1, borderColor: on ? T.brand : 'rgba(128,128,128,0.45)' }} />
          );
        })}
      </View>

      <Slider label="Тон" value={hsl.h} max={360} onChange={(h) => update({ h })} colors={HUES} T={T} ty={ty} />
      <Slider label="Насыщенность" value={hsl.s} max={100} onChange={(s) => update({ s })} colors={[hslToHex({ h: hsl.h, s: 0, l: hsl.l }), hueColor]} T={T} ty={ty} />
      <Slider label="Светлота" value={hsl.l} max={100} onChange={(l) => update({ l })} colors={['#000000', hslToHex({ h: hsl.h, s: hsl.s, l: 50 }), '#FFFFFF']} T={T} ty={ty} />

      {/* Hex — для тех, кто знает точный цвет бренда. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, borderCurve: 'continuous', backgroundColor: value, borderWidth: 1, borderColor: 'rgba(128,128,128,0.45)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[ty.caption2Em, { color: isLight(value) ? '#000' : '#fff' }]}>Aa</Text>
        </View>
        <TextInput
          value={hexDraft ?? value}
          onChangeText={(t) => { setHexDraft(t); const n = normalizeHex(t); if (n) onChange(n); }}
          onBlur={() => setHexDraft(null)}
          autoCapitalize="characters" autoCorrect={false} maxLength={7}
          accessibilityLabel="Код цвета"
          style={[ty.body, { flex: 1, color: T.label, backgroundColor: T.fillTertiary, borderRadius: 12, borderCurve: 'continuous', minHeight: 44, paddingHorizontal: 14 }]}
        />
      </View>
    </View>
  );
}
