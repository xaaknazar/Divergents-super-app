import React from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { Wrapper } from '../../components/Wrapper';
import { InlineNotice } from '../../components/InlineNotice';
import { ContentLoading } from '../../components/ContentLoading';
import { ColorWash } from '../../components/ColorWash';
import { ChallengeRankingHeader } from '../../components/ChallengeRanking';
import { ReadingRankingContent } from '../../components/ReadingRankingContent';
import { useReadingRanking } from '../../state/useReadingRanking';

/** Рейтинг Reading в том же стиле Apple Sports, что и рейтинг 21-дневного челленджа:
 * цветной фон из «Персонализации», шапка с логотипом и карточка «Рейтинг». */
export function ReadingRankingScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingRanking'>) {
  const { T } = useTheme();
  const state = useReadingRanking(route.params.challengeId);
  return <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
    <ColorWash />
    <NavHeader backLabel="Назад" onBack={() => navigation.goBack()} />
    <Screen topInset={false} onRefresh={state.retry} aurora={false} surface="transparent">
      <ChallengeRankingHeader title="Divergents Reading" />
      {state.error ? <Wrapper padding={16}><InlineNotice message={state.error} onRetry={state.retry} /></Wrapper> : null}
      {state.data ? <ReadingRankingContent key={state.data.id} data={state.data}
        onHistory={readerId => navigation.navigate('ReadingHistory', { challengeId: route.params.challengeId, readerId })} />
        : !state.error ? <ContentLoading /> : null}
    </Screen>
  </View>;
}
