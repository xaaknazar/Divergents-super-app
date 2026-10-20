import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { LayoutAnimation,View } from 'react-native';
import { ChallengeListItem,SportActivity,Trip } from '../data/community';
import { CommunityStackParams } from '../navigation/types';
import { useChannel } from '../state/ChannelContext';
import { useEnrollment } from '../state/EnrollmentContext';
import { tr,useLang } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { CommunityChallenges } from './CommunityChallenges';
import { CommunityChannelRow } from './CommunityChannelRow';
import { CommunitySportCard } from './CommunitySportCard';
import { CommunityTripCard } from './CommunityTripCard';
import { ContentEmptyState } from './ContentEmptyState';
import { ContentLoading } from './ContentLoading';
import { PersonalActivityCard } from './PersonalActivityCard';
import { SectionHeader } from './ui';
import { Wrapper } from './Wrapper';

type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
export function CommunityFeed({ navigation, setSeg, trips, sport, challenges, error, onRetry }: { navigation: Nav; setSeg: (i: number) => void; trips: Trip[] | null; sport: SportActivity[] | null; challenges: ChallengeListItem[] | null; error: boolean; onRetry: () => void }) {
  const { t } = useLang();
  const { reduceMotion } = useTheme();
  const { channels, error: channelsError, reload: reloadChannels } = useChannel();
  const { has, ready, statusOf } = useEnrollment();
  // Отклонённых заявок здесь уже нет (сервер их не отдаёт), но заявка на
  // рассмотрении — это ещё НЕ «Ваша поездка»: подписываем её честно.
  const myTrips = ready ? (trips ?? []).filter((trip) => has(`trip:${trip.id}`)) : [];
  const mySport = ready ? (sport ?? []).filter((activity) => has(`sport:${activity.id}`)) : [];
  const hasPersonalActivity = myTrips.length > 0 || mySport.length > 0;
  return (
    <>
      <CommunityChallenges navigation={navigation} challenges={challenges} error={error} onRetry={onRetry} />
      {/* Personal activity is visible only to the signed-up participant. */}
      {hasPersonalActivity ? <SectionHeader title={tr('Мои активности')} /> : null}
      {myTrips.map((trip) => (
        <Wrapper key={`mine-trip:${trip.id}`} marginHorizontal={16} marginBottom={10}><PersonalActivityCard icon="map.fill"
          eyebrow={statusOf(`trip:${trip.id}`) === 'pending' ? tr('Заявка на рассмотрении') : tr('Ваша поездка')}
          title={trip.title} subtitle={[trip.date, trip.region].filter(Boolean).join(' · ')}
          onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })} /></Wrapper>
      ))}
      {mySport.map((activity) => (
        <Wrapper key={`mine-sport:${activity.id}`} marginHorizontal={16} marginBottom={10}><PersonalActivityCard icon={activity.icon} eyebrow={statusOf(`sport:${activity.id}`) === 'pending' ? tr('Заявка на рассмотрении') : tr('Вы записаны')}
          title={activity.title} subtitle={[activity.date, activity.place].filter(Boolean).join(' · ')}
          onPress={() => navigation.navigate('SportDetail', { sportId: activity.id })} /></Wrapper>
      ))}
      {/* Channels first */}
      <SectionHeader title={t('sec_channels')} action={t('all')} onAction={() => navigation.navigate('Channels')} />
      {channels.length === 0
        ? <ContentEmptyState error={channelsError} onRetry={reloadChannels} icon="tray" title={tr('Пока ничего нет')} subtitle={tr('Каналы сообщества появятся здесь.')} />
        : channels.map((ch) => <CommunityChannelRow key={ch.id} channel={ch} navigation={navigation} variant="cover" />)}

      <View style={{ marginTop: 18 }}>
        <SectionHeader title={t('upcoming_trips')} action={t('all')} onAction={() => { if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(3); }} />
        {trips === null ? <ContentLoading /> : trips.length === 0 ? (
          <ContentEmptyState error={error} onRetry={onRetry} icon="map" title={tr('Пока ничего нет')} subtitle={tr('Поездки сообщества появятся здесь.')} />
        ) : (
          trips.map((tp) => <CommunityTripCard key={tp.id} trip={tp} navigation={navigation} />)
        )}
      </View>

      <View style={{ marginTop: 18 }}>
        <SectionHeader title={t('sec_sport')} action={t('all')} onAction={() => { if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(5); }} />
        {sport === null ? <ContentLoading /> : sport.length === 0 ? (
          <ContentEmptyState error={error} onRetry={onRetry} icon="figure.walk" title={tr('Пока ничего нет')} subtitle={tr('Спортивные активности появятся здесь.')} />
        ) : (
          sport.map((sp) => (
            <Wrapper marginHorizontal={16} marginBottom={14} key={sp.id}>
              <CommunitySportCard activity={sp} onPress={() => navigation.navigate('SportDetail', { sportId: sp.id })} />
            </Wrapper>
          ))
        )}
      </View>
    </>
  );
}
