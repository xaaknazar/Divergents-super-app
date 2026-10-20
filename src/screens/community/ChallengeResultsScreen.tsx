// Results are fetched by route ID, independent of any other active challenge.
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChallengeResultsPanel } from '../../components/ChallengeResultsPanel';
import { NavHeader } from '../../components/NavHeader';
import { Screen } from '../../components/Screen';
import { InlineNotice } from '../../components/InlineNotice';
import { ErrorState, ListSkeleton } from '../../components/StateViews';
import { Wrapper } from '../../components/Wrapper';
import { CommunityStackParams } from '../../navigation/types';
import { tr } from '../../state/LanguageContext';
import { useChallengeResults } from '../../state/useChallengeResults';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeResults'>;

export function ChallengeResultsScreen({ route, navigation }: Props) {
  const { challengeId } = route.params;
  const { data, loading, error, reload } = useChallengeResults(challengeId);
  return <Screen scroll={false} topInset={false} aurora={false} tabPadding={false}>
    <NavHeader title={tr('Итоги')} onBack={() => navigation.goBack()} />
    {!data ? loading ? <ListSkeleton /> : <ErrorState
      message={tr('Не удалось загрузить итоги. Проверьте подключение и попробуйте снова.')} onRetry={reload} />
      : <Screen topInset={false} aurora={false} tabPadding={false} onRefresh={reload}>
        {error || loading ? <Wrapper paddingHorizontal={16} paddingVertical={8}>
          <InlineNotice message={error ? tr('Не удалось обновить. Показаны ранее загруженные итоги.') : tr('Показаны сохранённые итоги · обновляем…')}
            onRetry={error ? reload : undefined} />
        </Wrapper> : null}
        <Wrapper paddingBottom={24}>
          <ChallengeResultsPanel key={data.challenge.id} data={data} onClaimed={reload}
            onOpenDays={() => navigation.navigate('ChallengeDays', { challengeId })}
            onOpenStandings={() => navigation.navigate('ChallengeFinalStandings', { challengeId })} />
        </Wrapper>
      </Screen>}
  </Screen>;
}
