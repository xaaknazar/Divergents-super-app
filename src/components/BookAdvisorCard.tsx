import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

export function BookAdvisorCard({ onPress }: { onPress: () => void }) {
  const { T, ty } = useTheme();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Спросить ИИ, что почитать" accessibilityHint="Открывает подбор книг с AI-помощником"
    style={({ pressed }) => ({ minHeight: 68, borderRadius: 16, borderCurve: 'continuous', padding: 14, backgroundColor: T.brandTintedStrong, opacity: pressed ? 0.7 : 1 })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><SF name="sparkles" size={20} color={T.onBrand} /></View>
      <View style={{ flex: 1, gap: 6 }}><Text style={[ty.headline, { color: T.label }]}>Спросить ИИ, что почитать</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>Подберёт книги под ваши таланты, психотип и цели</Text></View>
      <SF name="chevron.right" size={14} color={T.labelTertiary} />
    </View>
  </Pressable>;
}
