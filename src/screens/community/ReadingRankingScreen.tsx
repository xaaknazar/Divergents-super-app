import React from 'react';
import { RankingScreenFrame } from '../../components/RankingScreenFrame';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { Wrapper } from '../../components/Wrapper';
import { InlineNotice } from '../../components/InlineNotice';
import { ContentLoading } from '../../components/ContentLoading';
import { ChallengeRankingHeader } from '../../components/ChallengeRanking';
import { ReadingRankingContent } from '../../components/ReadingRankingContent';
import { useReadingRanking } from '../../state/useReadingRanking';

/** Рейтинг Reading в том же стиле Apple Sports, что и рейтинг 21-дневного челленджа:
 * цветной фон из «Персонализации», шапка с логотипом и карточка «Рейтинг». */
export function ReadingRankingScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingRanking'>) {
  const state = useReadingRanking(route.params.challengeId);
  return <RankingScreenFrame onBack={() => navigation.goBack()} onRefresh={state.retry}>
      <ChallengeRankingHeader title="Divergents Reading" />
      {state.error ? <Wrapper padding={16}><InlineNotice message={state.error} onRetry={state.retry} /></Wrapper> : null}
      {state.data ? <ReadingRankingContent key={state.data.id} data={state.data}
        onHistory={readerId => navigation.navigate('ReadingHistory', { challengeId: route.params.challengeId, readerId })} />
        : !state.error ? <ContentLoading /> : null}
  </RankingScreenFrame>;
}
