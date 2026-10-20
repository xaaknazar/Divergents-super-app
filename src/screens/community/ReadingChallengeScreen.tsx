import React, { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { ReadingChallengeContent } from '../../components/ReadingChallengeContent';
import { ReadingLocalPause } from '../../components/ReadingLocalPause';
import { InlineNotice } from '../../components/InlineNotice';
import { ContentLoading } from '../../components/ContentLoading';
import { Wrapper } from '../../components/Wrapper';
import { useReadingChallenge } from '../../state/useReadingChallenge';
import { useReadingBookCheck } from '../../state/useReadingBookCheck';

/** Reading challenge: навбар — только «‹ Сообщество», без фона и кнопок справа. */
export function ReadingChallengeScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingChallenge'>) {
  const { challengeId } = route.params;
  const reading = useReadingChallenge(challengeId);
  const book = useReadingBookCheck(challengeId);
  const retry = useRef(reading.retry);
  retry.current = reading.retry;
  const visited = useRef(false);
  useFocusEffect(useCallback(() => {
    if (visited.current) void retry.current();
    visited.current = true;
  }, []));
  return <Screen topInset={false} tabPadding={false} onRefresh={reading.retry}>
    <NavHeader backLabel="Сообщество" onBack={() => navigation.goBack()} />
    {reading.canPauseLocally && (!reading.data || reading.sessionNotice || reading.data.phase === 'upcoming' || reading.timerState !== 'running')
      ? <Wrapper padding={16} gap={12}>
        <ReadingLocalPause onPause={reading.pauseLocally} />
      </Wrapper> : null}
    {reading.data ? <ReadingChallengeContent data={reading.data} remainingMs={reading.remainingMs} timerState={reading.timerState}
      protection={reading.protection} blockingMode={reading.blockingMode} busy={reading.busy} error={reading.error} awaitingPages={reading.awaitingPages}
      resumableSession={reading.resumableSession} canResume={reading.canResume} onResume={reading.resume}
      sessionNotice={reading.sessionNotice} startBlocked={reading.startBlocked}
      needsRecovery={reading.needsRecovery} onRecover={reading.recover} book={book}
      onRanking={() => navigation.navigate('ReadingRanking', { challengeId })}
      onHistory={readerId => navigation.navigate('ReadingHistory', { challengeId, readerId })}
      onPrepare={reading.prepare} onStart={reading.start} onPause={reading.pause} onReport={reading.report} onSaveApproach={reading.saveApproach}
      onJoin={reading.join} onRetry={reading.retry} />
      : reading.error ? <Wrapper padding={16}><InlineNotice message={reading.error} onRetry={reading.retry} /></Wrapper> : <ContentLoading />}
  </Screen>;
}
