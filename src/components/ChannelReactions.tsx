import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hSelect } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { SF } from './SFIcon';

/** Реакции публикации: показываем только те, что уже ставили; остальные — по кнопке «Реакция». */
export function ChannelReactions({ options, counts = {}, mine, onReact }: {
  options: readonly string[]; counts?: Record<string, number>; mine?: string | null; onReact: (emoji: string) => void;
}) {
  const { T, ty } = useTheme();
  const [picking, setPicking] = useState(false);
  const used = options.filter(e => (counts[e] ?? 0) > 0 || mine === e);
  const react = (emoji: string) => { hSelect(); setPicking(false); onReact(emoji); };
  return <View style={styles.wrap}>
    {used.map(e => {
      const on = mine === e, n = counts[e] ?? 0;
      return <Pressable key={e} onPress={() => react(e)} accessibilityRole="button" accessibilityState={{ selected: on }}
        accessibilityLabel={`${e} ${n}${on ? ', ваша реакция' : ''}`}
        style={({ pressed }) => [styles.pill, { backgroundColor: on ? T.brandTinted : T.fillTertiary, borderColor: on ? T.brandText : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
        <Text style={styles.emoji}>{e}</Text>
        {n > 0 ? <Text style={[ty.footnoteEm, nums, { color: on ? T.brandText : T.labelSecondary }]}>{n}</Text> : null}
      </Pressable>;
    })}
    {picking ? options.filter(e => !used.includes(e)).map(e => <Pressable key={e} onPress={() => react(e)} accessibilityRole="button" accessibilityLabel={`Поставить ${e}`}
      style={({ pressed }) => [styles.pill, { backgroundColor: T.fillTertiary, borderColor: 'transparent', opacity: pressed ? 0.7 : 1 }]}>
      <Text style={styles.emoji}>{e}</Text>
    </Pressable>) : null}
    <Pressable onPress={() => setPicking(v => !v)} accessibilityRole="button" accessibilityState={{ expanded: picking }}
      accessibilityLabel={picking ? 'Скрыть реакции' : 'Поставить реакцию'}
      style={({ pressed }) => [styles.pill, { backgroundColor: 'transparent', borderColor: T.separator, opacity: pressed ? 0.7 : 1 }]}>
      <SF name={picking ? 'xmark' : 'face.smiling'} size={15} color={T.labelSecondary} />
      {!picking && used.length === 0 ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>Реакция</Text> : null}
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 34, paddingHorizontal: 10, borderRadius: 17, borderWidth: 1 },
  emoji: { fontSize: 15, lineHeight: 20 },
});
