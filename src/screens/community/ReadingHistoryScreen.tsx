import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { Wrapper } from '../../components/Wrapper';
import { InlineNotice } from '../../components/InlineNotice';
import { ContentLoading } from '../../components/ContentLoading';
import { ReadingHistoryContent } from '../../components/ReadingHistoryContent';
import { useReadingHistory } from '../../state/useReadingHistory';
export function ReadingHistoryScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingHistory'>) {
  const state = useReadingHistory(route.params.challengeId, route.params.readerId);
  return <Screen topInset={false} onRefresh={state.retry}>
    <NavHeader title="История чтения" onBack={() => navigation.goBack()} />
    {state.error ? <Wrapper padding={16}><InlineNotice message={state.error} onRetry={state.retry} /></Wrapper> : null}
    {state.data ? <ReadingHistoryContent data={state.data} busy={state.busy} onStatus={state.markBook} /> : !state.error ? <ContentLoading /> : null}
  </Screen>;
}
