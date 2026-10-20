import React from 'react';
import { ChallengeSpectatorContent } from '../../components/ChallengeSpectatorContent';
import { NavHeader } from '../../components/NavHeader';
import { Screen } from '../../components/Screen';
import { InlineNotice } from '../../components/InlineNotice';
import { ErrorState, ListSkeleton } from '../../components/StateViews';
import { Wrapper } from '../../components/Wrapper';
import { tr } from '../../state/LanguageContext';
import { useSpectatorStandings } from '../../state/useSpectatorStandings';

export function ChallengeSpectatorScreen({ challengeId, onBack }: { challengeId: string; onBack: () => void }) {
  const { data, loading, error, reload } = useSpectatorStandings(challengeId);
  return <Screen scroll={false} topInset={false} aurora={false} tabPadding={false}>
    <NavHeader title={tr('Рейтинги челленджа')} onBack={onBack} />
    {!data ? loading ? <ListSkeleton /> : <ErrorState message={tr('Рейтинг недоступен. Возможно, челлендж завершён. Попробуйте обновить.')} onRetry={reload} /> : <>
      {error || loading ? <Wrapper padding={16}><InlineNotice message={error ? tr('Не удалось обновить. Показан сохранённый рейтинг.') : tr('Показан сохранённый рейтинг · обновляем…')} onRetry={error ? reload : undefined} /></Wrapper> : null}
      <ChallengeSpectatorContent key={challengeId} data={data} refreshing={loading} onRefresh={reload} />
    </>}
  </Screen>;
}
