import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable,Text,View } from 'react-native';
import { imgUrl } from '../data/api';
import { Meetup } from '../data/community';
import { CommunityStackParams } from '../navigation/types';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ContentEmptyState } from './ContentEmptyState';
import { ContentLoading } from './ContentLoading';
import { SF } from './SFIcon';
import { ListSection } from './ui';
import { Wrapper } from './Wrapper';

type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
export function CommunityMeetups({ navigation, meetups, error, onRetry }: { navigation: Nav; meetups: Meetup[] | null; error: boolean; onRetry: () => void }) {
  const { T, ty } = useTheme();
  if (meetups === null) return <ContentLoading />;
  if (meetups.length === 0) {
    return <ContentEmptyState error={error} onRetry={onRetry} icon="calendar" title={tr('Пока ничего нет')} subtitle={tr('Встречи сообщества появятся здесь.')} />;
  }
  return (
    <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Все мероприятия')}>
      {meetups.map((m, i) => (
        <Pressable key={m.id} onPress={() => navigation.navigate('MeetupDetail', { meetupId: m.id })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          {m.imageUrl ? (
            <Image source={imgUrl(m.imageUrl, 256)} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
              <SF name="calendar" size={26} color={T.brand} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{m.title}</Text>
            {m.place ? (
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{[m.city, m.place].filter(Boolean).join(' · ')}</Text>
            ) : null}
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
              {[m.date, m.price].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <SF name="chevron.forward" size={14} color={T.labelTertiary} />
          {i < meetups.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 88, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
        </Pressable>
      ))}
    </ListSection></Wrapper>
  );
}
