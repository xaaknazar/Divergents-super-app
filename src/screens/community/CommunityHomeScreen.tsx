import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Segmented, SectionHeader, ListSection, Capsule, T, ty } from '../../components/ui';
import { ChallengeTaskRow } from '../../components/ChallengeTaskRow';
import { useChallenge } from '../../state/ChallengeContext';
import { MEDAL_FOR_RANK, TRIPS } from '../../data/community';
import { FEATURED_MEMBER } from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>;

export function CommunityHomeScreen({ navigation }: Props) {
  const [seg, setSeg] = useState(0);
  const { challenge, setMetric, toggleBinary, pointsToday, bonusToday, leaderboard, myRank, teamPoints } = useChallenge();
  const c = challenge;

  return (
    <Screen>
      <NavBarLarge title="Сообщество" trailing={<>
        <HeaderIcon name="magnifyingglass" />
        <HeaderIcon name="plus.circle" size={22} />
      </>} />

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Segmented items={['Челленджи', 'Поездки', 'Спорт', 'Встречи']} value={seg} onChange={setSeg} />
      </View>

      {seg === 1 ? (
        <TripsList navigation={navigation} />
      ) : seg >= 2 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <SF name={seg === 2 ? 'figure.run' : 'person.3.fill'} size={40} color={T.labelTertiary} />
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 12, textAlign: 'center' }]}>
            {seg === 2 ? 'Футбол, теннис, марафоны — скоро' : 'Локальные встречи сообщества — скоро'}
          </Text>
        </View>
      ) : (
        <>
          {/* Active challenge */}
          <Pressable onPress={() => navigation.navigate('ChallengeDetail')}
            style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: T.cardBg, borderRadius: 14, padding: 16 }}>
            <Text style={[ty.caption2Em, { color: T.brand, textTransform: 'uppercase', letterSpacing: 0.6 }]}>Активный челлендж</Text>
            <Text style={[ty.title2, { color: T.label, marginTop: 4 }]}>{c.title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>Команда «{c.teamName}» · +{teamPoints} pts командой</Text>
            <View style={{ marginTop: 12 }}>
              <ProgressBar value={c.currentDay / c.totalDays} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={[ty.subhead, { color: T.label }]}>День {c.currentDay} из {c.totalDays}</Text>
                <Text style={[ty.subhead, { color: T.labelSecondary }]}>{c.totalDays - c.currentDay} дней осталось</Text>
              </View>
            </View>

            <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[ty.footnoteEm, { color: T.label }]}>Сегодня · {c.tasks.length} задачи</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <SF name="flame.fill" size={11} color={T.orange} />
                <Text style={[ty.caption2, { color: T.green }]}>+{pointsToday} pts{bonusToday > 0 ? ` (·${bonusToday} бонус)` : ''}</Text>
              </View>
            </View>

            <View style={{ marginTop: 8, backgroundColor: T.fillQuaternary, borderRadius: 10, paddingHorizontal: 14 }}>
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
          </Pressable>

          {/* Stats cards */}
          <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 14, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SF name="flame.fill" size={16} color={T.orange} />
                <Text style={[ty.caption2, { color: T.labelSecondary, textTransform: 'uppercase' }]}>Серия</Text>
              </View>
              <Text style={[ty.title2, { color: T.label, marginTop: 6 }]}>{c.currentDay} дней</Text>
              <Text style={[ty.caption1, { color: T.orange }]}>Личный рекорд</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 14, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SF name="trophy.fill" size={16} color={T.yellow} />
                <Text style={[ty.caption2, { color: T.labelSecondary, textTransform: 'uppercase' }]}>Команда</Text>
              </View>
              <Text style={[ty.title2, { color: T.label, marginTop: 6 }]}>{c.teamRank} / {c.teamCount}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>+{teamPoints} pts</Text>
            </View>
          </View>

          {/* Leaderboard (live) */}
          <ListSection header={`Лидерборд команды · вы ${myRank}-е место`}>
            {leaderboard.map((row, i) => {
              const medal = MEDAL_FOR_RANK(row.rank);
              return (
                <Pressable key={row.id} onPress={() => !row.isMe && navigation.navigate('Member', { memberId: row.id })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: row.isMe ? T.brandTinted : 'transparent' }}>
                  <Text style={[ty.subheadEm, { color: T.labelSecondary, width: 20, textAlign: 'center' }]}>{row.rank}</Text>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: row.isMe ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[ty.subheadEm, { color: row.isMe ? '#fff' : T.label }]}>{row.name.charAt(0)}</Text>
                  </View>
                  <Text style={[ty.body, { flex: 1, color: T.label }]}>{row.name}{row.isMe ? <Text style={[ty.subhead, { color: T.brand }]}> · Вы</Text> : null}</Text>
                  {medal ? <SF name={medal.icon} size={16} color={medal.color} /> : null}
                  <Text style={[ty.headline, { color: T.label }]}>{row.points}</Text>
                  {i < leaderboard.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 48, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                </Pressable>
              );
            })}
          </ListSection>

          {/* Trips preview */}
          <View style={{ marginTop: 24 }}>
            <SectionHeader title="Предстоящие поездки" action="Все" onAction={() => setSeg(1)} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 12 }}>
              {TRIPS.map((t) => (
                <Pressable key={t.id} onPress={() => navigation.navigate('TripDetail', { tripId: t.id })}
                  style={{ width: 260, backgroundColor: T.cardBg, borderRadius: 14, overflow: 'hidden' }}>
                  <View style={{ height: 130, backgroundColor: t.tint, padding: 10 }}>
                    <Capsule bg="rgba(255,255,255,0.7)" color={T.label}><SF name="calendar" size={11} color={T.labelSecondary} />{t.date}</Capsule>
                    <View style={{ position: 'absolute', right: 12, top: 40, opacity: 0.35 }}>
                      <SF name="mappin.and.ellipse" size={50} color={T.brand} />
                    </View>
                  </View>
                  <View style={{ padding: 12 }}>
                    <Text style={[ty.headline, { color: T.label }]}>{t.title}</Text>
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{t.meta}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Featured member */}
          <ListSection header="Участник недели" style={{ marginTop: 8 }}>
            <ListRowMember navigation={navigation} />
          </ListSection>
          <View style={{ height: 20 }} />
        </>
      )}
    </Screen>
  );
}

function ListRowMember({ navigation }: { navigation: Props['navigation'] }) {
  const m = FEATURED_MEMBER;
  return (
    <Pressable onPress={() => navigation.navigate('Member', { memberId: m.id })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[ty.title3, { color: '#fff' }]}>{m.initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ty.headline, { color: T.label }]}>{m.name}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{m.role} · {m.psychotype}</Text>
      </View>
      <SF name="chevron.forward" size={14} color={T.labelTertiary} />
    </Pressable>
  );
}

function TripsList({ navigation }: { navigation: Props['navigation'] }) {
  return (
    <ListSection header="Все поездки">
      {TRIPS.map((t, i) => (
        <Pressable key={t.id} onPress={() => navigation.navigate('TripDetail', { tripId: t.id })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="mappin.and.ellipse" size={24} color={T.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]}>{t.title}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{t.date} · {t.days} дня</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{t.meta} · {t.price}</Text>
          </View>
          <SF name="chevron.forward" size={14} color={T.labelTertiary} />
          {i < TRIPS.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 80, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
        </Pressable>
      ))}
    </ListSection>
  );
}
