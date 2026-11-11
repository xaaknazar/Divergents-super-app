import React,{ useRef,useState } from 'react';
import { Pressable,TextInput,View,useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { SF } from './SFIcon';
import { GlassSurface } from './GlassSurface';
import { MapGlassMaterial } from './MapGlassMaterial';

/** Shared catalog search: a stable name, native search keyboard and clear target.
 * surface="raised" — стеклянная капсула поверх цветного фона вкладки или карты (iOS 26). */
export function SearchField({ value, onChangeText, placeholder, label = placeholder, onFocus, onBlur, surface = 'grouped' }: {
  value: string; onChangeText: (value: string) => void; placeholder: string; label?: string;
  onFocus?: () => void; onBlur?: () => void; surface?: 'grouped' | 'raised' | 'map';
}) {
  const { T, ty } = useTheme();
  const { fontScale } = useWindowDimensions();
  const inputHeight = Math.max(minTouch, Math.ceil((ty.body.fontSize ?? 17) * fontScale * 1.35) + 20);
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const glass = surface !== 'grouped';
  const map = surface === 'map';
  const secondary = map ? '#182843' : T.labelSecondary;
  const body = <>
    <SF name="magnifyingglass" size={18} color={secondary} />
    <TextInput ref={input} value={value} onChangeText={onChangeText} accessibilityLabel={label}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => { setFocused(false); onBlur?.(); }}
      placeholder={placeholder} placeholderTextColor={secondary} autoCorrect={false} autoCapitalize="none"
      returnKeyType="search" clearButtonMode="never" selectionColor={T.brandText}
      style={[ty.body, { flex: 1, minWidth: 0, color: map ? '#182843' : T.label,
        height: inputHeight, padding: 0, lineHeight: undefined, includeFontPadding: false, textAlignVertical: 'center' }]} />
    {value ? <Pressable accessibilityRole="button" accessibilityLabel="Очистить поиск"
      onPress={() => { onChangeText(''); input.current?.focus(); }}
      style={({ pressed }) => ({ width: minTouch, minHeight: minTouch, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <SF name="xmark.circle.fill" size={20} color={secondary} />
    </Pressable> : null}
  </>;
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'flex-start' as const, gap: 8,
    paddingLeft: glass ? 16 : 12, paddingRight: value ? 0 : glass ? 16 : 12, minHeight: minTouch };
  const focusRing = { borderWidth: 1, borderColor: focused ? T.brandText : 'transparent' };
  if (map) return <View style={[row, { borderRadius: radius.pill }, focusRing]}><MapGlassMaterial role="search" />{body}</View>;
  if (glass) return <GlassSurface style={[row, { borderRadius: radius.pill }, focusRing]}>{body}</GlassSurface>;
  return <View style={[row, { backgroundColor: T.fillTertiary, borderRadius: 12, borderCurve: 'continuous' }, focusRing]}>{body}</View>;
}
