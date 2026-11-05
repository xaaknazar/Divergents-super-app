// «Рейтинг участников» теперь вкладка единого рейтинга челленджа.
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { ChallengeRankingScreen } from './ChallengeRankingScreen';

type Props = NativeStackScreenProps<CommunityStackParams, 'OverallStandings'>;

export function OverallStandingsScreen({ navigation, route }: Props) {
  return <ChallengeRankingScreen challengeId={route.params?.challengeId} initialTab="members" onBack={() => navigation.goBack()} />;
}
