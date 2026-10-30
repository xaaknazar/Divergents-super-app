import React from 'react';
import { ActivityIndicator,Pressable,TextInput,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
export function ChatComposer({ value, onChangeText, onSend, disabled, busy, placeholder, multiline = false, inputLabel = 'Сообщение ассистенту' }: {
  value: string; onChangeText: (text: string) => void; onSend: () => void;
  disabled: boolean; busy: boolean; placeholder: string; multiline?: boolean; inputLabel?: string;
}) {
  const { T, ty } = useTheme();
  const blocked = disabled || busy || !value.trim();
  return <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
    <TextInput accessibilityLabel={inputLabel} accessibilityState={{ disabled }} value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor={T.labelSecondary} selectionColor={T.brandText}
      style={[ty.body, { flex: 1, minWidth: 0, minHeight: 48, maxHeight: multiline ? 120 : undefined, color: T.label, paddingVertical: 9, paddingHorizontal: 14,
        backgroundColor: T.cardBg, borderRadius: 18, borderCurve: 'continuous', borderWidth: 0.5, borderColor: T.separator }]}
      multiline={multiline} onSubmitEditing={multiline ? undefined : () => { if (!blocked) onSend(); }} returnKeyType={multiline ? 'default' : 'send'} editable={!disabled} />
    <Pressable accessibilityRole="button" accessibilityLabel="Отправить сообщение" accessibilityState={{ disabled: blocked, busy }}
      onPress={onSend} disabled={blocked} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24,
        backgroundColor: blocked ? T.fillTertiary : T.brand, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      {busy ? <ActivityIndicator color={T.labelSecondary} /> : <SF name="arrow.up" size={22} color={blocked ? T.labelSecondary : T.onBrand} />}
    </Pressable>
  </View>;
}
