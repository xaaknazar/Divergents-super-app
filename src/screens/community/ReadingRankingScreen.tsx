import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { Wrapper } from '../../components/Wrapper';
import { InlineNotice } from '../../components/InlineNotice';
import { ContentLoading } from '../../components/ContentLoading';
import { ReadingRankingContent } from '../../components/ReadingRankingContent';
import { useReadingRanking } from '../../state/useReadingRanking';

export function ReadingRankingScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingRanking'>) {
  const state = useReadingRanking(route.params.challengeId);
  return <Screen topInset={false} onRefresh={state.retry}>
    <NavHeader title="Рейтинг участников" largeTitle backLabel="Назад" onBack={() => navigation.goBack()} />
    {state.error ? <Wrapper padding={16}><InlineNotice message={state.error} onRetry={state.retry} /></Wrapper> : null}
    {state.data ? <ReadingRankingContent key={state.data.id} data={state.data}
      onHistory={readerId => navigation.navigate('ReadingHistory', { challengeId: route.params.challengeId, readerId })} />
      : !state.error ? <ContentLoading /> : null}
  </Screen>;
}
