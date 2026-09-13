// Team-vs-team ranking (Рейтинг команд). Shows every team by total points with
// its rank; the signed-in user's own team is highlighted. Data is server-computed
// and rides along in the active-challenge payload (challenge.teamStandings).
import React from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { tr } from '../../state/LanguageContext';
import { useChallenge } from '../../state/ChallengeContext';
import { MEDAL_FOR_RANK } from '../../data/community';
import * as pl from '../../data/plural';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'TeamStandings'>;

export function TeamStandingsScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const { challenge } = useChallenge();
  const standings = challenge.teamStandings ?? [];

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
          <ListSection header={tr('Все команды')} footer={tr('Очки команды — сумма баллов всех её участников за челлендж.')}>
            {standings.map((tm, i) => {
              const medal = MEDAL_FOR_RANK(tm.rank);
              return (
                <View key={tm.id} style={{ position: 'relative' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: tm.isMine ? T.brandTinted : 'transparent' }}>
                    <View style={{ width: 30, alignItems: 'center' }}>
                      {medal ? <SF name={medal.icon} size={20} color={medal.color} /> : <Text style={[ty.headline, { color: T.labelSecondary }]}>{tm.rank}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>
                        {tm.name}{tm.isMine ? <Text style={[ty.caption1, { color: T.brand }]}>{`  · ${tr('ваша')}`}</Text> : null}
                      </Text>
                      <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                        {pl.people(tm.members)}
                        {/* Выбывшие важнее числа флагов: команда теряет человека
                            насовсем, и по составу это видно не сразу. */}
                        {tm.eliminated ? ` · ${tr('выбыло')} ${tm.eliminated}` : ''}
                        {tm.left ? ` · 🏳️ ${tm.left}` : ''}
                      </Text>
                    </View>
                    {/* Флаги команды — сумма по всем участникам. Показываем
                        только когда они есть: у чистой команды пустое место
                        читается лучше, чем «🚩 0». */}
                    {tm.flags ? (
                      <Capsule bg="rgba(255,59,48,0.14)" color={T.red}>🚩 {tm.flags}</Capsule>
                    ) : null}
                    <Text style={[ty.headline, { color: tm.isMine ? T.brand : T.label }]} numberOfLines={1}>{tm.points} pts</Text>
                  </View>
                  {i < standings.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 58, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                </View>
              );
            })}
          </ListSection>
        )}
        <View style={{ height: 30 }} />
      </Screen>
    </View>
  );
}
