import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FieldLabel } from './FieldLabel';
/** Event-specific input modes own their size and validation limits. */
export function EventTextField({ label, value, onChange, mode = 'text', disabled = false, required = true }: {
  label: string; value: string; onChange: (value: string) => void; mode?: 'text' | 'description' | 'note' | 'number' | 'coordinate'; disabled?: boolean; required?: boolean;
}) {
  const { T, ty } = useTheme(); const multiline = mode === 'description' || mode === 'note';
  return <View><FieldLabel label={label} required={required} />
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} multiline={multiline}
      maxLength={mode === 'description' ? 6000 : mode === 'note' ? 1000 : mode === 'number' ? 6 : 300}
      keyboardType={mode === 'number' ? 'number-pad' : mode === 'coordinate' ? 'numbers-and-punctuation' : 'default'}
      style={[ty.body, styles.field, multiline && styles.multiline, { color: T.label, backgroundColor: T.fillTertiary }]} />
  </View>;
}
const styles = StyleSheet.create({ field: { minHeight: 50, padding: 16, borderRadius: 16 }, multiline: { minHeight: 100, textAlignVertical: 'top' } });
