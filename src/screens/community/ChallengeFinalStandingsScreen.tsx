import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChallengeFinalStandingsContent } from '../../components/ChallengeFinalStandingsContent';
import { ErrorState, ListSkeleton } from '../../components/StateViews';
import { NavHeader } from '../../components/NavHeader';
import { Screen } from '../../components/Screen';
import { InlineNotice } from '../../components/InlineNotice';
import { Wrapper } from '../../components/Wrapper';
import { CommunityStackParams } from '../../navigation/types';
import { tr } from '../../state/LanguageContext';
import { useChallengeResults } from '../../state/useChallengeResults';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeFinalStandings'>;

export function ChallengeFinalStandingsScreen({ route, navigation }: Props) {
  const { data, loading, error, reload } = useChallengeResults(route.params.challengeId);
  return <Screen scroll={false} topInset={false} aurora={false} tabPadding={false}>
    <NavHeader title={tr('Итоговые рейтинги')} backLabel={tr('Итоги')} onBack={() => navigation.goBack()} />
    {!data ? loading ? <ListSkeleton /> : <ErrorState message={tr('Не удалось загрузить итоговые рейтинги. Попробуйте ещё раз.')} onRetry={reload} />
      : <>
        {error || loading ? <Wrapper paddingHorizontal={16} paddingBottom={8}><InlineNotice
          message={error ? tr('Не удалось обновить. Показаны ранее загруженные итоги.') : tr('Показаны сохранённые итоги · обновляем…')}
          onRetry={error ? reload : undefined} /></Wrapper> : null}
        <ChallengeFinalStandingsContent key={data.challenge.id} data={data} refreshing={loading} onRefresh={reload} />
      </>}
  </Screen>;
}
