import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SF } from './SFIcon';
import { useChannelAppearance } from './useChannelAppearance';

export function ChannelSearch({ value, onChange, onClose, placeholder = 'Поиск' }: {
  value: string; onChange: (value: string) => void; onClose?: () => void; placeholder?: string;
}) {
  const C = useChannelAppearance();
  return <View style={styles.row}>
    <View style={[styles.field, { backgroundColor: C.search }]}>
      <SF name="magnifyingglass" size={19} color={C.secondary} />
      <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={C.secondary}
        value={value} onChangeText={onChange} autoCorrect={false} returnKeyType="search"
        style={[styles.input, { color: C.label, fontSize: 17 * C.textScale }]} selectionColor={C.accent} />
      {value ? <Pressable accessibilityRole="button" accessibilityLabel="Очистить поиск" onPress={() => onChange('')} style={styles.clear}>
        <SF name="xmark.circle.fill" size={18} color={C.secondary} />
      </Pressable> : null}
    </View>
    {onClose ? <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть поиск" style={styles.cancel}>
      <Text style={{ color: C.accent, fontSize: 16 * C.textScale }}>Отмена</Text>
    </Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 26, paddingLeft: 14 },
  input: { minHeight: 48, paddingVertical: 10, paddingRight: 12, flex: 1, minWidth: 0 },
  clear: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, cancel: { minHeight: 48, justifyContent: 'center' },
});
