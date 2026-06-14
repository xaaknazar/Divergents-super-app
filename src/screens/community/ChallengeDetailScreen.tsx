import React from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '../../components/Screen';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, ListRow, T, ty } from '../../components/ui';
import { ChallengeTaskRow } from '../../components/ChallengeTaskRow';
import { useChallenge } from '../../state/ChallengeContext';
import { MEDAL_FOR_RANK } from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeDetail'>;

export function ChallengeDetailScreen({ navigation }: Props) {
  const { challenge, setMetric, toggleBinary, pointsToday, bonusToday, leaderboard, myRank, teamPoints } = useChallenge();
  const c = challenge;
  const ringPct = c.currentDay / c.totalDays;
  const r = 47;
  const circ = 2 * Math.PI * r;

  return (
    <Screen tabPadding={false} topInset={false}>
      <BackNav back="Сообщество" onBack={() => navigation.goBack()} trailing={<SF name="ellipsis" size={20} color={T.brandAccent} />} />

      {/* Hero */}
      <View style={{ padding: 20, paddingBottom: 16 }}>
        <Capsule bg={T.brandTinted} color={T.brand}><SF name="flag.fill" size={11} color={T.brand} />День {c.currentDay} из {c.totalDays}</Capsule>
        <Text style={[ty.largeTitle, { color: T.label, marginTop: 12 }]}>{c.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>Команда «{c.teamName}» · {c.members} участников · {c.startedLabel}</Text>
      </View>

      {/* Progress ring */}
      <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: T.cardBg, borderRadius: 14, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <View style={{ width: 110, height: 110 }}>
          <Svg width={110} height={110} viewBox="0 0 110 110">
            <Circle cx={55} cy={55} r={r} fill="none" stroke={T.fillTertiary} strokeWidth={8} />
            <Circle cx={55} cy={55} r={r} fill="none" stroke={T.brand} strokeWidth={8}
              strokeDasharray={`${ringPct * circ} ${circ}`} strokeLinecap="round"
              transform="rotate(-90 55 55)" />
          </Svg>
          <View style={{ position: 'absolute', width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[ty.title1, { color: T.label }]}>{Math.round(ringPct * 100)}%</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>прогресс</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ty.headline, { color: T.label }]}>Серия {c.currentDay} дней</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>Личный рекорд</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <SF name="flame.fill" size={16} color={T.orange} />
            <Text style={[ty.subheadEm, { color: T.label }]}>+{teamPoints} pts</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary }]}>командой</Text>
          </View>
        </View>
      </View>

      {/* Calendar */}
      <ListSection header="Календарь">
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: c.totalDays }, (_, i) => {
              const done = i < c.currentDay;
              const today = i === c.currentDay - 1;
              return (
                <View key={i} style={{
                  width: '12%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: done ? T.brand : T.fillTertiary,
                  borderWidth: today ? 2 : 0, borderColor: T.orange,
                }}>
                  <Text style={[ty.caption2Em, { color: done ? '#fff' : T.labelSecondary }]}>{i + 1}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ListSection>

      {/* Today's tasks (interactive) */}
      <ListSection
        header={`Сегодня · день ${c.currentDay}`}
        footer={`Бонусы за превышение нормы идут команде. +${pointsToday} pts сегодня${bonusToday > 0 ? ` (включая +${bonusToday} бонусных)` : ''}.`}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {c.tasks.map((t, i) => (
            <ChallengeTaskRow
              key={t.id}
              task={t}
              divider={i < c.tasks.length - 1}
              onToggle={() => toggleBinary(t.id)}
              onAdjust={t.kind === 'metric' ? (d) => setMetric(t.id, t.current + d) : undefined}
              step={t.kind === 'metric' ? (t.id === 'steps' ? 500 : 1) : 1}
            />
          ))}
        </View>
      </ListSection>

      {/* Team */}
      <ListSection header={`Команда «${c.teamName}» · вы ${myRank}-е место`}>
        {leaderboard.map((row, i) => {
          const medal = MEDAL_FOR_RANK(row.rank);
          return (
            <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: row.isMe ? T.brandTinted : 'transparent' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.subheadEm, { color: '#fff' }]}>{row.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ty.body, { color: T.label }]}>{row.name}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]}>День {row.day} · {row.points} pts</Text>
              </View>
              {medal ? <SF name={medal.icon} size={16} color={medal.color} /> : <SF name="flame.fill" size={14} color={T.orange} />}
              {i < leaderboard.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 64, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
            </View>
          );
        })}
      </ListSection>

      <ListSection footer={`Челлендж от тренера ${c.trainer} · стоимость ${c.price}`}>
        <ListRow leading={<SF name="bell.fill" size={18} color={T.orange} />} title="Напоминания" detail="3 раза в день" chevron />
        <ListRow leading={<SF name="person.3.fill" size={18} color={T.brand} />} title="Чат команды" detail="14 новых" chevron last />
      </ListSection>
      <View style={{ height: 30 }} />
    </Screen>
  );
}
