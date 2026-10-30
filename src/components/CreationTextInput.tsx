import React from 'react';
import { TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function CreationTextInput({ label, value, onChange, placeholder, kind = 'text', disabled = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string;
  kind?: 'text' | 'number' | 'nickname'; disabled?: boolean;
}) {
  const { T, ty } = useTheme();
  return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder}
    placeholderTextColor={T.labelTertiary} editable={!disabled} keyboardType={kind === 'number' ? 'number-pad' : 'default'}
    maxLength={kind === 'number' ? 5 : 180} autoCapitalize={kind === 'nickname' ? 'none' : 'sentences'} autoCorrect={kind !== 'nickname'}
    style={[ty.body, { minHeight: 48, backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous',
      paddingVertical: 12, paddingHorizontal: 14, color: T.label, opacity: disabled ? 0.5 : 1 }]} />;
}
