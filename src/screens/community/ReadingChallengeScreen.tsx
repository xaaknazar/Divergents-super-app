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
import { useReadingLibrary } from '../../state/useReadingLibrary';
import { useReadingAllowedApps } from '../../state/useReadingAllowedApps';

/** Reading challenge: навбар — только «‹ Сообщество», без фона и кнопок справа. */
export function ReadingChallengeScreen({ route, navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingChallenge'>) {
  const { challengeId } = route.params;
  const reading = useReadingChallenge(challengeId);
  const book = useReadingBookCheck(challengeId);
  const draft = useReadingBookCheck(challengeId, 'draft');
  const library = useReadingLibrary(challengeId, reading.data?.me?.userId, reading.data?.reportedSessionIds.join('|'));
  const allowedApps = useReadingAllowedApps(challengeId, reading.data?.session?.id, reading.protection === 'ready');
  // Refresh the permanent shelf too: another device can add a book without
  // creating a reading receipt or changing the challenge's reported sessions.
  const refresh = async () => { await Promise.all([reading.retry(), library.retry(), allowedApps?.retry?.()]); };
  const retry = useRef(refresh);
  retry.current = refresh;
  const visited = useRef(false);
  useFocusEffect(useCallback(() => {
    if (visited.current) void retry.current();
    visited.current = true;
  }, []));
  const pagesRequired = reading.awaitingPages || reading.resumableSession && reading.timerState === 'paused' && reading.remainingMs <= 0;
  return <Screen topInset={false} tabPadding={false} keyboardAware onRefresh={refresh}
    scrollResetKey={pagesRequired ? `reading-pages:${challengeId}:${reading.data?.session?.id}` : undefined}>
    <NavHeader backLabel="Сообщество" onBack={() => navigation.goBack()} />
    {reading.canPauseLocally && (!reading.data || reading.sessionNotice || reading.data.phase === 'upcoming' || reading.timerState !== 'running')
      ? <Wrapper padding={16} gap={12}>
        <ReadingLocalPause onPause={reading.pauseLocally} />
      </Wrapper> : null}
    {reading.data ? <ReadingChallengeContent data={reading.data} remainingMs={reading.remainingMs} timerState={reading.timerState}
      protection={reading.protection} blockingMode={reading.blockingMode} busy={reading.actionBusy} error={reading.error} awaitingPages={reading.awaitingPages}
      resumableSession={reading.resumableSession} canResume={reading.canResume} onResume={reading.resume}
      sessionElapsedMs={reading.sessionElapsedMs}
      sessionNotice={reading.sessionNotice} startBlocked={reading.startBlocked}
      needsRecovery={reading.needsRecovery} onRecover={reading.recover}
      startRecovery={reading.startRecovery} onContinueStart={reading.continueStart} book={book} library={{ ...library, select: book.selectSaved }}
      allowedApps={allowedApps}
      composer={{ draft, supported: library.supportsBookshelf, adding: library.adding, error: library.addError,
        reset: () => { draft.reset(); library.clearAddError(); },
        save: async () => draft.verified ? !!(await library.add(draft.verified)) : false }}
      onRanking={() => navigation.navigate('ReadingRanking', { challengeId })}
      onHistory={readerId => navigation.navigate('ReadingHistory', { challengeId, readerId })}
      onPrepare={reading.prepare} onStart={reading.start} onPause={reading.pause} onReport={reading.report} onSaveApproach={reading.saveApproach}
      onJoin={reading.join} onRetry={reading.retry} />
      : reading.error ? <Wrapper padding={16}><InlineNotice message={reading.error} onRetry={reading.retry} /></Wrapper> : <ContentLoading />}
  </Screen>;
}
