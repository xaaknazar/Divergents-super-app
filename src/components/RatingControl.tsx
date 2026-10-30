import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { SF } from './SFIcon';

export function RatingControl({ value, onChange, disabled = false }: { value: number | null; onChange: (value: number) => void; disabled?: boolean }) {
  const { T, ty } = useTheme();
  return <ContentBlock size="flush">
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label, padding: 14, paddingBottom: 0 }]}>Моя оценка</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingVertical: 12 }}>
      {[1, 2, 3, 4, 5].map(rating => <Pressable key={rating} accessibilityRole="button" accessibilityLabel={`${rating} из 5`}
        accessibilityState={{ selected: value === rating, disabled }} disabled={disabled} onPress={() => onChange(rating)}
        style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.65 : 1 })}>
        <SF name={(value ?? 0) >= rating ? 'star.fill' : 'star'} size={30} color={(value ?? 0) >= rating ? T.orangeText : T.labelSecondary} />
      </Pressable>)}
    </View>
  </ContentBlock>;
}
