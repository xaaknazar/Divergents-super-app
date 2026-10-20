import React, { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { ReadingChallengeContent } from '../../components/ReadingChallengeContent';
import { InlineNotice } from '../../components/InlineNotice';
import { ContentLoading } from '../../components/ContentLoading';
import { Wrapper } from '../../components/Wrapper';
import { useReadingChallenge } from '../../state/useReadingChallenge';
import { useReadingBookSearch } from '../../state/useReadingBookSearch';
import { useReadingAppearance } from '../../state/useReadingAppearance';
import { HeaderIcon } from '../../components/HeaderIcon';
import { useAuth } from '@clerk/clerk-expo';
import { useRole } from '../../state/useRole';

export function ReadingChallengeScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingChallenge'>) {
  const reading = useReadingChallenge(route.params.challengeId);
  const bookSearch = useReadingBookSearch();
  const { appearance } = useReadingAppearance();
  const { userId } = useAuth();
  const { has } = useRole();
  const canReview = has('challenges') || !!reading.data?.teams.some(t => t.captainId === userId);
  const retry = useRef(reading.retry);
  retry.current = reading.retry;
  const visited = useRef(false);
  useFocusEffect(useCallback(() => {
    if (visited.current) void retry.current();
    visited.current = true;
  }, []));
  return <Screen topInset={false} tabPadding={false} onRefresh={reading.retry}>
    <NavHeader title="Reading challenge" backLabel="Сообщество" onBack={() => navigation.goBack()}
      trailing={<HeaderIcon name="slider.horizontal.3" label="Оформление Reading" onPress={() => navigation.navigate('ReadingAppearance')} />} />
    {reading.data ? <ReadingChallengeContent data={reading.data} remainingMs={reading.remainingMs} timerState={reading.timerState}
      protection={reading.protection} busy={reading.busy} error={reading.error} awaitingPages={reading.awaitingPages}
      headerVariant={appearance.header} sessionNotice={reading.sessionNotice} startBlocked={reading.startBlocked}
      canReviewApplications={canReview} onApplications={() => navigation.navigate('ReadingApplicants', { challengeId: route.params.challengeId })}
      needsRecovery={reading.needsRecovery} onRecover={reading.recover}
      onResolve={reading.resolve}
      bookSearch={bookSearch}
      onHistory={readerId => navigation.navigate('ReadingHistory', { challengeId: route.params.challengeId, readerId })}
      onPrepare={reading.prepare} onStart={reading.start} onPause={reading.pause} onReport={reading.report}
      onJoin={reading.join} onRetry={reading.retry} />
      : reading.error ? <Wrapper padding={16}><InlineNotice message={reading.error} onRetry={reading.retry} /></Wrapper> : <ContentLoading />}
  </Screen>;
}
