// Team roster (Состав команды). Every member sees who's on the team — name,
// day, points and a clear red-flag badge — but NOT the anketa. Captains and
// managers (curators/teachers) can tap a member to open the full anketa directly.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, ty } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { tr } from '../../state/LanguageContext';
import { useChallenge } from '../../state/ChallengeContext';
import { useRole } from '../../state/useRole';
import { totalFlags, flagsToEliminate, MEDAL_FOR_RANK } from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeRoster'>;

export function ChallengeRosterScreen({ navigation, route }: Props) {
  const { challengeId } = route.params;
  const { T } = useTheme();
  const { userId } = useAuth();
  const { canCreate } = useRole();
  const { challenge, leaderboard } = useChallenge();
  const isCaptain = !!challenge.captainId && challenge.captainId === userId;
  const maxFlags = flagsToEliminate(challenge.rules);
  // Only a captain of this team or a manager may open teammates' anketas.
  const canSeeAnketa = isCaptain || canCreate;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Челлендж')} onBack={() => navigation.goBack()} />
      <Screen tabPadding={false} topInset={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={[ty.largeTitle, { color: T.label }]} numberOfLines={2}>{tr('Состав команды')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]} numberOfLines={1}>
            {challenge.teamName ? `«${challenge.teamName}» · ` : ''}{leaderboard.length} {tr('участников')}
          </Text>
          {canSeeAnketa ? (
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 6 }]} numberOfLines={2}>
              {tr('Нажмите на участника, чтобы открыть его анкету')}
            </Text>
          ) : null}
        </View>

        {leaderboard.length === 0 ? (
          <EmptyState icon="person.2.fill" title={tr('Команда ещё формируется')} subtitle={tr('Участники появятся здесь после одобрения заявок.')} />
        ) : (
          <ListSection header={tr('Участники')} footer={`${tr('🚩 — флаги за пропуск дневной нормы (чтение / без сахара / активность).')} ${maxFlags} ${tr('в одной категории → 🏳️ вылет.')}`}>
            {leaderboard.map((m, i) => {
              const flagN = totalFlags(m.flags);
              const out = m.eliminated === true;
              const medal = MEDAL_FOR_RANK(m.rank);
              const row = (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: m.isMe ? T.brandTinted : 'transparent', opacity: out ? 0.6 : 1 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: out ? T.labelTertiary : T.brand, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[ty.subheadEm, { color: '#fff' }]}>{out ? '🏳️' : m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>
                      {m.name}{m.isMe ? <Text style={[ty.caption1, { color: T.brand }]}>{`  · ${tr('вы')}`}</Text> : null}
                    </Text>
                    {/* m.day — это БАЛЛЫ ЗА СЕГОДНЯ, а не номер дня: подпись
                        «День 45» читалась как 45-й день челленджа. */}
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                      {tr('Сегодня')} {m.day} · {tr('всего')} {m.points} pts{out ? ` · ${tr('выбыл')}` : ''}
                    </Text>
                  </View>
                  {flagN > 0 ? (
                    <Capsule bg="rgba(255,59,48,0.14)" color={T.red}>🚩 {flagN}</Capsule>
                  ) : medal ? <SF name={medal.icon} size={16} color={medal.color} /> : null}
                  {canSeeAnketa ? <SF name="chevron.forward" size={13} color={T.labelTertiary} /> : null}
                </View>
              );
              return (
                <View key={m.id} style={{ position: 'relative' }}>
                  {canSeeAnketa
                    ? <Pressable onPress={() => navigation.navigate('ChallengeApplicants', { challengeId, applicantUserId: m.id })} accessibilityRole="button" accessibilityLabel={`${tr('Анкета')} — ${m.name}`}>{row}</Pressable>
                    : row}
                  {i < leaderboard.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 66, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
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
