import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function FieldError({ message }: { message?: string }) {
  const { T, ty } = useTheme();
  return message ? <Text accessibilityLiveRegion="polite" style={[ty.footnote, { color: T.redText, marginTop: 6 }]}>{message}</Text> : null;
}
