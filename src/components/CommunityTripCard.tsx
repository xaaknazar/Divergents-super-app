import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useChannel } from '../state/ChannelContext';
import { tr } from '../state/LanguageContext';
import { Trip, ChallengeListItem, daysUntil, teamsNeed } from '../data/community';
import { Channel } from '../data/channel';
import { imgUrl } from '../data/api';
import * as pl from '../data/plural';
import { CommunityStackParams } from '../navigation/types';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { Wrapper } from './Wrapper';
type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
const HERO_TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } as const;

export function CommunityTripCard({ trip, navigation }: { trip: Trip; navigation: Nav }) {
  const { T, ty } = useTheme();
  return (
    <Pressable onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
      style={({ pressed }) => ({ marginHorizontal: 16, marginBottom: 14, backgroundColor: T.cardBg, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 0.5, borderColor: T.cardBorder, opacity: pressed ? 0.9 : 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 })}>
      {trip.imageUrl ? (
        <View style={{ height: 150 }}>
          <Image source={imgUrl(trip.imageUrl, 800)} style={{ width: '100%', height: 150 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          {trip.date ? <View style={{ position: 'absolute', top: 12, left: 12 }}><StatusBadge label={String((trip.date))} tone="inverse" variant="media" icon="calendar" /></View> : null}
        </View>
      ) : (
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.04)']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ width: 52, height: 52, borderRadius: 15, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <SF name="map.fill" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: '#fff' }, HERO_TEXT_SHADOW]} numberOfLines={2}>{trip.title}</Text>
            {trip.date ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <SF name="calendar" size={11} color="#fff" />
                <Text style={[ty.caption1, { color: '#fff' }, HERO_TEXT_SHADOW]} numberOfLines={1}>{trip.date}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      )}
      <View style={{ padding: 14 }}>
        {trip.imageUrl ? <Text style={[ty.headline, { color: T.label, marginBottom: 8 }]} numberOfLines={1}>{trip.title}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge label={String((tr('Офлайн')))} tone="warning" icon="figure.walk" />
          {trip.region ? <StatusBadge label={String((trip.region))} tone="neutral" icon="mappin.and.ellipse" /> : null}
          {trip.difficulty ? <StatusBadge label={String((trip.difficulty))} tone="neutral" /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <Text style={[ty.caption1, { color: T.labelSecondary, flexShrink: 1 }]} numberOfLines={1}>{trip.meta}</Text>
          <Text style={[ty.subheadEm, { color: T.brand }]} numberOfLines={1}>{trip.price}</Text>
        </View>
      </View>
    </Pressable>
  );
}
