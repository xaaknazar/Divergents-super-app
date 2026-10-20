// «Предстоящие поездки» (в макете — EventCard variant="plain" kind="trip"): мятная
// карточка с силуэтом гор и солнцем справа, зелёная плашка иконки (горы; палатка —
// для поездки с ночёвкой), «стеклянные» бейджи, линия над нижней строкой, цена зелёным.
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { Trip } from '../data/community';
import { CommunityStackParams } from '../navigation/types';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { CardMotif } from './CardMotif';
import { IconTile,iconTileInk } from './IconTile';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { TappableSurface } from './TappableSurface';
import { Wrapper } from './Wrapper';
type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];

export function CommunityTripCard({ trip, navigation }: { trip: Trip; navigation: Nav }) {
  const { T, ty, isDark } = useTheme();
  return (
    <Wrapper marginHorizontal={16} marginBottom={14}>
      <TappableSurface onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
        accessibilityLabel={[trip.title, trip.date].filter(Boolean).join(', ')}>
        <CardMotif kind="trip" />
        <View style={styles.head}>
          <IconTile icon={trip.days >= 2 ? 'tent.fill' : 'mountain.2.fill'} tone="trip" variant="solid" size="md" />
          <View style={styles.titles}>
            <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]} numberOfLines={2}>{trip.title}</Text>
            {trip.date ? <View style={styles.date}>
              <SF name="calendar" size={12} color={T.labelSecondary} />
              <Text style={[ty.footnote, { color: T.labelSecondary, flexShrink: 1 }]} numberOfLines={1}>{trip.date}</Text>
            </View> : null}
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.badges}>
            <StatusBadge label={tr('Офлайн')} tone="warning" icon="person.2.fill" variant="frosted" />
            {trip.region ? <StatusBadge label={trip.region} tone="neutral" icon="mappin.and.ellipse" variant="frosted" /> : null}
            {trip.difficulty ? <StatusBadge label={trip.difficulty} tone="neutral" variant="frosted" /> : null}
          </View>
          <View style={[styles.footer, { borderTopColor: isDark ? T.separator : 'rgba(0,0,0,0.07)' }]}>
            <Text style={[ty.caption1, { color: T.labelSecondary, flexShrink: 1 }]} numberOfLines={1}>{trip.meta}</Text>
            {trip.price ? <Text style={[ty.subheadEm, { color: iconTileInk('trip', isDark) }]} numberOfLines={1}>{trip.price}</Text> : null}
          </View>
        </View>
      </TappableSurface>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingHorizontal: 14 },
  titles: { flex: 1, minWidth: 0, gap: 3 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  body: { padding: 14 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
