import { Wrapper } from '../../components/Wrapper';
// Team-vs-team ranking (Рейтинг команд). Shows every team by total points with
// its rank; the signed-in user's own team is highlighted. Data is server-computed
// and rides along in the active-challenge payload (challenge.teamStandings).
import React from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { TeamStandingsTable } from '../../components/TeamStandingsTable';
import { EmptyState } from '../../components/StateViews';
import { tr } from '../../state/LanguageContext';
import { useChallenge } from '../../state/ChallengeContext';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'TeamStandings'>;

export function TeamStandingsScreen({ navigation, route }: Props) {
  const { T, ty } = useTheme();
  const { challenge } = useChallenge(route.params.challengeId);
  const standings = challenge.teamStandings ?? [];
  const caption = challenge.currentDay > 0
    ? `${tr('День')} ${challenge.currentDay} ${tr('из')} ${challenge.totalDays}${challenge.currentDay > 1 ? ` · ${tr('изменения со вчера')}` : ''}`
    : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Челлендж')} onBack={() => navigation.goBack()} />
      <Screen tabPadding={false} topInset={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={[ty.largeTitle, { color: T.label }]} numberOfLines={2}>{tr('Рейтинг команд')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]} numberOfLines={1}>
            {standings.length} {tr('команд')}{challenge.title ? ` · ${challenge.title}` : ''}
          </Text>
        </View>

        {standings.length === 0 ? (
          <EmptyState icon="trophy.fill" title={tr('Рейтинг ещё пуст')} subtitle={tr('Команды появятся здесь, когда наберут очки.')} />
        ) : (
          <Wrapper marginTop={6} marginHorizontal={16}>
            <TeamStandingsTable teams={standings} caption={caption} />
            <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 16, paddingTop: 8 }]}>
              {tr('± — на сколько мест команда поднялась (▲) или опустилась (▼) со вчера. Очки команды — сумма баллов всех её участников.')}
            </Text>
          </Wrapper>
        )}
        <View style={{ height: 30 }} />
      </Screen>
    </View>
  );
}
