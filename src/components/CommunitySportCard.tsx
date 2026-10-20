// «Спорт» на главной «Сообщества» (в макете — EventRow variant="card" kind="sport"):
// светло-синяя карточка с беговой дорожкой справа и плашкой иконки вида спорта.
import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { SportActivity } from '../data/community';
import { useTheme } from '../theme/ThemeContext';
import { CardMotif } from './CardMotif';
import { IconTile } from './IconTile';
import { SF } from './SFIcon';
import { TappableSurface } from './TappableSurface';

export function CommunitySportCard({ activity, onPress }: { activity: SportActivity; onPress: () => void }) {
  const { T, ty } = useTheme();
  const meta = [activity.place, activity.date].filter(Boolean).join(' · ');
  return <TappableSurface onPress={onPress} accessibilityLabel={[activity.title, meta].filter(Boolean).join(', ')}>
    <CardMotif kind="sport" />
    <View style={styles.row}>
      <IconTile icon={activity.icon} tone="sport" variant="solid" size="lg" />
      <View style={styles.text}>
        <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{activity.title}</Text>
        {meta ? <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <SF name="chevron.forward" size={16} color={T.labelTertiary} />
    </View>
  </TappableSurface>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  text: { flex: 1, minWidth: 0, gap: 2 },
});
