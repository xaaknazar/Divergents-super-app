import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ChallengeListItem } from '../data/community';
import { CommunityStackParams } from '../navigation/types';
import { useChallenge } from '../state/ChallengeContext';
import { tr } from '../state/LanguageContext';
import { ActiveChallengeCard } from './ActiveChallengeCard';
import { CommunityChallengeCard } from './CommunityChallengeCard';
import { ContentEmptyState } from './ContentEmptyState';
import { ContentLoading } from './ContentLoading';
import { SectionHeader } from './ui';
import { ReadingChallengeShelf } from './ReadingChallengeShelf';
import { useReadingCatalog } from '../state/useReadingCatalog';
import { useReadingAppearance } from '../state/useReadingAppearance';

type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
export function CommunityChallenges({ navigation, challenges, error, onRetry }: { navigation: Nav; challenges: ChallengeListItem[] | null; error: boolean; onRetry: () => void }) {
  const reading = useReadingCatalog();
  const { appearance } = useReadingAppearance();
  const { challenge: myChallenge, activeChallenges, isParticipant, loading, error: participationError } = useChallenge();
  const mine = activeChallenges ?? (isParticipant ? [myChallenge] : []);
  const myIds = new Set(mine.map(ch => ch.id));
  // Everyone can see ongoing challenges in this tab. Replace the participant's
  // own catalog card with their tracker card, without duplicating it.
  const otherActive = (challenges ?? []).filter((x) => x.status === 'active' && !myIds.has(x.id));
  const hasActive = mine.length > 0 || otherActive.length > 0;
  const upcoming = (challenges ?? []).filter((x) => x.status === 'upcoming');
  return (
    <>
      <ReadingChallengeShelf items={reading.items} error={reading.error} onRetry={reading.retry} onOpen={challengeId => navigation.navigate('ReadingChallenge', { challengeId })}
        variant={appearance.card} onAppearance={() => navigation.navigate('ReadingAppearance')} />
      <SectionHeader title={tr('Активные челленджи')} />
      {loading ? <ContentLoading /> : hasActive ? (
        <>
          {mine.map(ch => <ActiveChallengeCard key={ch.id} challengeId={ch.id} navigation={navigation} />)}
          {otherActive.map((ch) => (
            <CommunityChallengeCard key={ch.id} ch={ch} onPress={() => {
              // A failed membership check is not a denial: the detail screen
              // offers retry and keeps the tracker closed until access is known.
              navigation.navigate('ChallengeDetail', { challengeId: ch.id });
            }} />
          ))}
        </>
      ) : challenges === null ? <ContentLoading /> : (
        <ContentEmptyState error={error || participationError} onRetry={onRetry} icon="flame.fill" title={tr('Сейчас нет активного челленджа')} subtitle={tr('Следите за анонсами — новый старт скоро.')} />
      )}
      <SectionHeader title={tr('Открыт набор')} />
      {challenges === null ? <ContentLoading /> : upcoming.length === 0 ? (
        <ContentEmptyState error={error} onRetry={onRetry} icon="calendar" title={tr('Пока ничего нет')} subtitle={tr('Новые челленджи появятся здесь.')} />
      ) : upcoming.map((ch) => (
        <CommunityChallengeCard key={ch.id} ch={ch} onPress={() => navigation.navigate('ChallengeDetail', { challengeId: ch.id })} />
      ))}
    </>
  );
}
