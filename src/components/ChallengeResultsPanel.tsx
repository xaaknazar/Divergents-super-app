import { useAuth } from '@clerk/clerk-expo';
import React from 'react';
import { claimChallengeAward } from '../data/community';
import { ChallengeResultsContent } from './ChallengeResultsContent';

/** Authenticated adapter; the reusable results surface is independently previewable. */
export function ChallengeResultsPanel(props: Omit<React.ComponentProps<typeof ChallengeResultsContent>, 'onClaimAward'>) {
  const { getToken } = useAuth();
  return <ChallengeResultsContent {...props} onClaimAward={async () => claimChallengeAward(props.data.challenge.id, await getToken())} />;
}
