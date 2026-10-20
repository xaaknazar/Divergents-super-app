import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { CommunityStackParams } from '../navigation/types';
import { useChallenge } from '../state/ChallengeContext';
import { ChallengeProgressSummary } from './ChallengeProgressSummary';
import { Wrapper } from './Wrapper';

type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
export function ActiveChallengeCard({ navigation, challengeId }: { navigation: Nav; challengeId?: string }) {
  const { challenge: c, teamPoints, pointsToday } = useChallenge(challengeId);
  return <Wrapper marginHorizontal={16} marginBottom={16}>
    <ChallengeProgressSummary title={c.title} day={c.currentDay} totalDays={c.totalDays} teamName={c.teamName} members={c.members}
      teamPoints={teamPoints} pointsToday={pointsToday} rank={c.teamRank} teamCount={c.teamCount} eliminated={!!c.eliminated || c.whiteFlag?.left === true}
      onPress={() => navigation.navigate('ChallengeDetail', { challengeId: c.id })} />
  </Wrapper>;
}
