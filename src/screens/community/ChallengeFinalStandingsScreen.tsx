import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { ChallengeSpectatorScreen } from './ChallengeSpectatorScreen';
type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeFinalStandings'>;
export function ChallengeFinalStandingsScreen({ route, navigation }: Props) {
  return <ChallengeSpectatorScreen challengeId={route.params.challengeId} onBack={() => navigation.goBack()} />;
}
