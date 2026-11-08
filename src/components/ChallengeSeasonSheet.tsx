import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChallengeSeason } from '../data/challengeSeasons';
import { useTheme } from '../theme/ThemeContext';
import { HalfSheet } from './HalfSheet';
import { SF } from './SFIcon';
import { Button } from './Button';
export function ChallengeSeasonSheet({ visible, seasons, selected, loading, error, onRetry, onClose, onSelect }: {
  visible: boolean; seasons: ChallengeSeason[]; selected: string; loading: boolean; error: boolean;
  onRetry: () => void; onClose: () => void; onSelect: (id: string) => void;
}) {
  const { T, ty } = useTheme();
  return <HalfSheet visible={visible} title="Сезоны челленджа" onClose={onClose}>
    {loading ? <ActivityIndicator accessibilityLabel="Загружаем сезоны" color={T.brandText} /> : null}
    {error ? <Button label="Повторить загрузку сезонов" variant="tinted" onPress={onRetry} /> : null}
    {!loading && !error && !seasons.length ? <Text style={[ty.body, { color: T.labelSecondary }]}>Пока нет доступных сезонов.</Text> : null}
    {seasons.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: selected === item.id }} onPress={() => onSelect(item.id)}
      style={[styles.row, { borderBottomColor: T.separator }]}>
      <View style={styles.text}><Text style={[ty.headline, { color: T.label }]}>Сезон {item.season}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{item.title}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{item.finished ? 'Завершён · итоговые результаты' : 'Идёт сейчас'}</Text>
        {item.finished && item.champion ? <View style={styles.champion}>
          <SF name="trophy.fill" size={16} color={T.brandText} />
          <Text style={[ty.subhead, styles.championName, { color: T.label }]}>Чемпион — {item.champion.name}</Text>
        </View> : null}</View>
      {selected === item.id ? <SF name="checkmark" size={20} color={T.brandText} /> : <SF name="chevron.right" size={16} color={T.labelSecondary} />}
    </Pressable>)}
  </HalfSheet>;
}
const styles = StyleSheet.create({ row: { minHeight: 80, paddingVertical: 14, flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth }, text: { flex: 1, gap: 3 }, champion: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 }, championName: { flex: 1 } });
