import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
export function ScreenDescription({ text }: { text: string }) {
  const { T, ty } = useTheme();
  return <Text style={[ty.subhead, { color: T.labelSecondary }]}>{text}</Text>;
}
