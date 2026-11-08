import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { Meetup } from '../data/community';
import { imgUrl } from '../data/api';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { TappableSurface } from './TappableSurface';

export function CommunityMeetupCard({ meetup, onPress }: { meetup: Meetup; onPress: () => void }) {
  const { T, ty } = useTheme();
  const city = meetup.city?.trim() || tr('Город не указан');
  return <TappableSurface onPress={onPress} accessibilityLabel={[meetup.title, city, meetup.date].filter(Boolean).join(', ')}>
    <View style={styles.body}>
      <StatusBadge label={tr('Активное мероприятие')} icon="calendar" tone="brand" />
      <View style={styles.heading}>
        {meetup.imageUrl ? <Image source={imgUrl(meetup.imageUrl, 256)} contentFit="cover" cachePolicy="memory-disk" style={styles.image} />
          : <View style={[styles.placeholder, { backgroundColor: T.brandTinted }]}><SF name="calendar" size={26} color={T.brandText} /></View>}
        <View style={styles.titleBlock}>
          <Text style={[ty.headline, { color: T.label }]}>{meetup.title}</Text>
          <View style={styles.location}>
            <SF name="mappin.and.ellipse" size={14} color={T.brandText} />
            <Text style={[ty.subheadEm, styles.grow, { color: T.brandText }]}>{city}</Text>
          </View>
        </View>
        <SF name="chevron.forward" size={14} color={T.labelTertiary} />
      </View>
      {meetup.date ? <Text style={[ty.footnote, { color: T.label }]}>{meetup.date}</Text> : null}
      {meetup.place ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{meetup.place}</Text> : null}
    </View>
  </TappableSurface>;
}
const styles = StyleSheet.create({
  body: { padding: 16, gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  image: { width: 56, height: 56, borderRadius: 14 },
  placeholder: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1, minWidth: 0, gap: 6 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  grow: { flex: 1 },
});
