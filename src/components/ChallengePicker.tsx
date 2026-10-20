import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Chip } from './Chip';

/** Explicit workout destination; never changes another challenge's daily record. */
export function ChallengePicker({ challenges, selectedId, onChange, disabled = false }: {
  challenges: readonly { id: string; title: string }[]; selectedId: string;
  onChange: (id: string) => void; disabled?: boolean;
}) {
  const { T, ty } = useTheme();
  if (challenges.length < 2) return null;
  return <View style={{ gap: 8 }}>
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>Зачёт тренировки в челлендж</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {challenges.map(c => <Chip key={c.id} label={c.title} active={c.id === selectedId} onPress={disabled ? undefined : () => onChange(c.id)} />)}
    </View>
  </View>;
}
