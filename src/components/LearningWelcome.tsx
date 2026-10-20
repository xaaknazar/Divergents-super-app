import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Logo } from './Logo';
import { coursesWord } from '../data/api';

export function LearningWelcome({ displayName, courseCount }: { displayName?: string | null; courseCount: number }) {
  const { T, ty } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <Logo size={36} />
    <View style={{ flex: 1 }}>
      <Text style={[ty.footnote, { color: T.labelSecondary, letterSpacing: 0.2 }]}>
        {displayName ? `Привет, ${displayName}` : 'Divergents'}
      </Text>
      <Text style={[ty.headline, { color: T.label, marginTop: 2 }]}>
        {courseCount ? `${coursesWord(courseCount)} · non-stop development` : 'Non-stop development'}
      </Text>
    </View>
  </View>;
}
