import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { ContentLoading } from '../../components/ContentLoading';
import { InlineNotice } from '../../components/InlineNotice';
import { ReadingStatisticsContent } from '../../components/ReadingStatisticsContent';
import { ReadingStoryEditor } from '../../components/ReadingStoryEditor';
import { useReadingHistory } from '../../state/useReadingHistory';
export function ReadingStatisticsScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingStatistics'>) {
  const history = useReadingHistory(route.params.challengeId, route.params.readerId);
  const [sharing, setSharing] = useState(false);
  return <Screen topInset={false} tabPadding={false} onRefresh={history.retry}>
    <NavHeader title={sharing ? 'Карточка для сторис' : 'Статистика'} backLabel="Назад" onBack={() => sharing ? setSharing(false) : navigation.goBack()} />
    {history.error ? <InlineNotice message={history.error} onRetry={history.retry} /> : null}
    {history.data ? sharing ? <ReadingStoryEditor data={history.data} /> : <ReadingStatisticsContent data={history.data} onShare={() => setSharing(true)} /> : <ContentLoading />}
  </Screen>;
}
