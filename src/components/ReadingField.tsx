import React from 'react';
import { TextInput, View } from 'react-native';
import { FieldLabel } from './FieldLabel';
import { useTheme } from '../theme/ThemeContext';
import { FieldError } from './FieldError';

export function ReadingField({ label, value, onChange, kind = 'text', disabled = false, error, required = true }: {
  label: string; value: string; onChange: (value: string) => void; kind?: 'text' | 'number' | 'nickname'; disabled?: boolean; error?: string; required?: boolean;
}) {
  const { T, ty } = useTheme();
  return <View><FieldLabel label={label} required={required} invalid={!!error} />
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled}
      keyboardType={kind === 'number' ? 'number-pad' : 'default'} maxLength={kind === 'number' ? 6 : 180}
      autoCapitalize={kind === 'nickname' ? 'none' : 'sentences'} autoCorrect={kind !== 'nickname'}
      style={[ty.body, { minHeight: 50, padding: 14, borderRadius: 14, backgroundColor: T.fillTertiary, color: T.label }]} />
    <FieldError message={error} />
  </View>;
}
