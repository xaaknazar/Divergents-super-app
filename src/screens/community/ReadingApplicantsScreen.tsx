import React from 'react';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { ReadingApplicantsContent } from '../../components/ReadingApplicantsContent';
import { useReadingApplicants } from '../../state/useReadingApplicants';

export function ReadingApplicantsScreen({ route, navigation }: {
  route: { params: { challengeId: string } }; navigation: { goBack: () => void };
}) {
  const state = useReadingApplicants(route.params.challengeId);
  return <Screen topInset={false} tabPadding={false} onRefresh={state.reload}>
    <NavHeader title="Заявки команды" onBack={() => navigation.goBack()} />
    <ReadingApplicantsContent {...state} onRetry={state.reload} onSelect={state.select} onClose={state.close}
      onRetryProfile={state.retryProfile} onDecide={state.decide} onRetryDecision={state.retryDecision} />
  </Screen>;
}
