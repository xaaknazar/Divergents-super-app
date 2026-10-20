import React,{ useRef,useState } from 'react';
import { Pressable,TextInput,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { SF } from './SFIcon';

/** Shared catalog search: a stable name, native search keyboard and clear target. */
export function SearchField({ value, onChangeText, placeholder, label = placeholder, onFocus, onBlur }: {
  value: string; onChangeText: (value: string) => void; placeholder: string; label?: string;
  onFocus?: () => void; onBlur?: () => void;
}) {
  const { T, ty } = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.fillTertiary,
    borderRadius: 12, borderCurve: 'continuous', borderWidth: focused ? 1 : 0, borderColor: T.brandText,
    paddingLeft: 12, paddingRight: value ? 0 : 12, minHeight: minTouch }}>
    <SF name="magnifyingglass" size={18} color={T.labelSecondary} />
    <TextInput ref={input} value={value} onChangeText={onChangeText} accessibilityLabel={label}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => { setFocused(false); onBlur?.(); }}
      placeholder={placeholder} placeholderTextColor={T.labelSecondary} autoCorrect={false} autoCapitalize="none"
      returnKeyType="search" clearButtonMode="never" selectionColor={T.brandText}
      style={[ty.body, { flex: 1, minWidth: 0, color: T.label, minHeight: minTouch, paddingVertical: 10 }]} />
    {value ? <Pressable accessibilityRole="button" accessibilityLabel="Очистить поиск"
      onPress={() => { onChangeText(''); input.current?.focus(); }}
      style={({ pressed }) => ({ width: minTouch, minHeight: minTouch, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <SF name="xmark.circle.fill" size={20} color={T.labelSecondary} />
    </Pressable> : null}
  </View>;
}
