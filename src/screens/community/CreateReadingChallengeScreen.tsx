import React, { useEffect } from 'react';
import { Alert, Keyboard } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { ReadingChallengeForm } from '../../components/ReadingChallengeForm';
import { ReadingPublicationReview } from '../../components/ReadingPublicationReview';
import { CreationSuccess } from '../../components/CreationSuccess';
import { ContentLoading } from '../../components/ContentLoading';
import { InlineNotice } from '../../components/InlineNotice';
import { Wrapper } from '../../components/Wrapper';
import { readingDateLabel } from '../../data/readingCreation';
import { useReadingCreation } from '../../state/useReadingCreation';
import { hSuccess } from '../../lib/haptics';

export function CreateReadingChallengeScreen({ navigation }: NativeStackScreenProps<CommunityStackParams, 'CreateReadingChallenge'>) {
  const { state, busy, submit, reload } = useReadingCreation();
  usePreventRemove(busy, () => Alert.alert('Публикация проверяется', 'Дождитесь ответа. При сбое запрос останется на телефоне для повторной проверки.'));
  useEffect(() => { if (state.phase === 'success') hSuccess(); }, [state.phase]);
  if (state.phase === 'success' && state.publication && state.challengeId) {
    const draft = state.publication.draft, challengeId = state.challengeId;
    return <CreationSuccess kind="challenge" celebrate title={draft.title} dateLabel={`${readingDateLabel(draft.startDate)} · 00:00, Казахстан`}
      summary={`${draft.mode === 'continuous' ? 'Без даты окончания' : `${draft.durationDays} дн.`} · ${draft.teams.length ? `Команд: ${draft.teams.length}` : 'Индивидуальный зачёт'} · 60 минут чтения в день`} destination="detail"
      onOpen={() => navigation.replace('ReadingChallenge', { challengeId })}
      onClose={() => navigation.popTo('CommunityHome', { refresh: Date.now(), focus: 'challenge' })} />;
  }
  if (state.phase === 'editing') return <ReadingChallengeForm busy={busy} error={state.error} initialDraft={state.draft}
    onCancel={() => navigation.goBack()} onSubmit={draft => { Keyboard.dismiss(); void submit(draft); }} />;
  return <Screen topInset={false} tabPadding={false} keyboardAware><NavHeader title="Новый челлендж" backLabel="Назад" onBack={() => { if (!busy) navigation.goBack(); }} />
    {state.phase === 'loading' ? <ContentLoading />
      : state.phase === 'pending' && state.publication ? <ReadingPublicationReview draft={state.publication.draft} busy={busy} error={state.error} onRetry={() => { void submit(); }} />
      : state.phase === 'blocked' ? <Wrapper padding={16}><InlineNotice message={state.error ?? 'Не удалось проверить публикацию'} onRetry={reload} /></Wrapper>
      : null}
  </Screen>;
}
