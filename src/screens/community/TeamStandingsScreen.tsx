// «Рейтинг команд» теперь вкладка единого рейтинга челленджа.
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { ChallengeRankingScreen } from './ChallengeRankingScreen';

type Props = NativeStackScreenProps<CommunityStackParams, 'TeamStandings'>;

export function TeamStandingsScreen({ navigation, route }: Props) {
  return <ChallengeRankingScreen challengeId={route.params.challengeId} initialTab="teams" onBack={() => navigation.goBack()} />;
}
