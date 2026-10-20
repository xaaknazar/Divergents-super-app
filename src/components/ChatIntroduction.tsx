import React from 'react';
import { Text,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { StatusBadge } from './StatusBadge';
export function ChatIntroduction({ title, description }: { title: string; description: string }) {
  const { T, ty } = useTheme();
  return <View style={{ gap: 14, paddingTop: 28, paddingHorizontal: 20, alignItems: 'center' }}>
    <StatusBadge label={title} tone="brand" icon="sparkles" />
    <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', maxWidth: 340 }]}>{description}</Text>
  </View>;
}
