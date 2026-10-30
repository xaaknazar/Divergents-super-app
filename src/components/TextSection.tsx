import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { SF } from './SFIcon';

export function TextSection({ title, text, variant = 'standard' }: { title: string; text: string; variant?: 'standard' | 'editorial' }) {
  const { T, ty } = useTheme();
  return <ContentBlock><View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {variant === 'editorial' ? <SF name="quote.bubble.fill" size={20} color={T.brandText} /> : null}
      <Text accessibilityRole="header" style={[ty.headline, { color: T.label, flex: 1 }]}>{title}</Text>
    </View>
    <Text style={[ty.body, { color: T.labelSecondary }]}>{text}</Text>
  </View></ContentBlock>;
}
