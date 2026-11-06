import React,{ useRef,useState } from 'react';
import { Pressable,TextInput,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { SF } from './SFIcon';
import { GlassSurface } from './GlassSurface';

/** Shared catalog search: a stable name, native search keyboard and clear target.
 * surface="raised" — стеклянная капсула поверх цветного фона вкладки или карты (iOS 26). */
export function SearchField({ value, onChangeText, placeholder, label = placeholder, onFocus, onBlur, surface = 'grouped' }: {
  value: string; onChangeText: (value: string) => void; placeholder: string; label?: string;
  onFocus?: () => void; onBlur?: () => void; surface?: 'grouped' | 'raised';
}) {
  const { T, ty } = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const glass = surface === 'raised';
  const body = <>
    <SF name="magnifyingglass" size={18} color={T.labelSecondary} />
    <TextInput ref={input} value={value} onChangeText={onChangeText} accessibilityLabel={label}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => { setFocused(false); onBlur?.(); }}
      placeholder={placeholder} placeholderTextColor={T.labelSecondary} autoCorrect={false} autoCapitalize="none"
      returnKeyType="search" clearButtonMode="never" selectionColor={T.brandText}
      style={[ty.body, { position: 'relative', flex: 1, minWidth: 0, color: T.label, minHeight: minTouch, paddingVertical: 10 }]} />
    {value ? <Pressable accessibilityRole="button" accessibilityLabel="Очистить поиск"
      onPress={() => { onChangeText(''); input.current?.focus(); }}
      style={({ pressed }) => ({ width: minTouch, minHeight: minTouch, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <SF name="xmark.circle.fill" size={20} color={T.labelSecondary} />
    </Pressable> : null}
  </>;
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'flex-start' as const, gap: 8,
    paddingLeft: glass ? 16 : 12, paddingRight: value ? 0 : glass ? 16 : 12, minHeight: minTouch };
  if (glass) return <GlassSurface interactive style={[row, { borderRadius: radius.pill, borderWidth: focused ? 1 : 0, borderColor: T.brandText }]}>{body}</GlassSurface>;
  return <View style={[row, { backgroundColor: T.fillTertiary, borderRadius: 12, borderCurve: 'continuous', borderWidth: focused ? 1 : 0, borderColor: T.brandText }]}>{body}</View>;
}
