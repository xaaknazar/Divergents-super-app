import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function PageHeading({ title, description, summary }: { title: string; description?: string; summary?: string }) {
  const { T, ty } = useTheme();
  return <View style={{ gap: 8 }}>
    <Text accessibilityRole="header" style={[ty.title2, { color: T.label }]}>{title}</Text>
    {description ? <Text style={[ty.body, { color: T.labelSecondary }]}>{description}</Text> : null}
    {summary ? <Text style={[ty.subheadEm, { color: T.brandText }]}>{summary}</Text> : null}
  </View>;
}
