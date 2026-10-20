import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable,Text,View } from 'react-native';
import { imgUrl } from '../data/api';
import { Trip } from '../data/community';
import { CommunityStackParams } from '../navigation/types';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ContentEmptyState } from './ContentEmptyState';
import { ContentLoading } from './ContentLoading';
import { SF } from './SFIcon';
import { ListSection } from './ui';
import { Wrapper } from './Wrapper';

type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
export function CommunityTrips({ navigation, trips, error, onRetry }: { navigation: Nav; trips: Trip[] | null; error: boolean; onRetry: () => void }) {
  const { T, ty } = useTheme();
  if (trips === null) return <ContentLoading />;
  if (trips.length === 0) return <ContentEmptyState error={error} onRetry={onRetry} icon="map" title={tr('Пока ничего нет')} subtitle={tr('Поездки сообщества появятся здесь.')} />;
  return (
    <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Все поездки')}>
      {trips.map((t, i) => (
        <Pressable key={t.id} onPress={() => navigation.navigate('TripDetail', { tripId: t.id })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <Image source={imgUrl(t.imageUrl, 256)} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{t.title}</Text>
            {/* `meta` — это уже «регион · дата», поэтому строка «{date} · {meta} · {price}»
                читалась как «12 авг · Алматы · 12 авг · Бесплатно». Собираем один раз
                и только из непустых кусков. */}
            {[t.region, t.difficulty].filter(Boolean).length > 0 ? (
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{[t.region, t.difficulty].filter(Boolean).join(' · ')}</Text>
            ) : null}
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{[t.date, t.price].filter(Boolean).join(' · ')}</Text>
          </View>
          <SF name="chevron.forward" size={14} color={T.labelTertiary} />
          {i < trips.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 88, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
        </Pressable>
      ))}
    </ListSection></Wrapper>
  );
}
