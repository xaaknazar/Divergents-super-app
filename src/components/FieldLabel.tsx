import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function FieldLabel({ label, required = false, invalid = false, nativeID }: {
  label: string; required?: boolean; invalid?: boolean; nativeID?: string;
}) {
  const { T, ty } = useTheme();
  return <Text nativeID={nativeID} style={[ty.subheadEm, { color: invalid ? T.redText : T.label, marginBottom: 8 }]}>{label}{required ? ' *' : ''}</Text>;
}
