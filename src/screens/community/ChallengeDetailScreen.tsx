import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '../../components/Screen';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, ListRow, PrimaryButton, IconSquircle, T, ty } from '../../components/ui';
import { ChallengeTaskRow } from '../../components/ChallengeTaskRow';
import { useChallenge } from '../../state/ChallengeContext';
import {
  MEDAL_FOR_RANK, getChallengeMeta, daysUntil,
  CHALLENGE_CATEGORIES, CHALLENGE_RULES, ACTIVITY_CONVERSIONS, CHALLENGE_TEAMS,
} from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeDetail'>;

export function ChallengeDetailScreen({ route, navigation }: Props) {
  const challengeId = route.params?.challengeId ?? 'no-sugar-21';
  const meta = getChallengeMeta(challengeId);
  if (meta?.status === 'upcoming') {
    return <UpcomingChallenge challengeId={challengeId} navigation={navigation} />;
  }
  return <ActiveChallenge navigation={navigation} />;
}

// ─── Upcoming challenge (30 Days) — rules, teams, join ──────────────
function UpcomingChallenge({ challengeId, navigation }: { challengeId: string; navigation: Props['navigation'] }) {
  const insets = useSafeAreaInsets();
  const meta = getChallengeMeta(challengeId)!;
  const left = daysUntil(meta.startISO);

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      {/* Gradient hero background */}
      <LinearGradient colors={['#1E337A', '#2A4DA8', '#3D5BDB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6 }}>
            <SF name="chevron.left" size={20} color="#fff" />
            <Text style={[ty.body, { color: '#fff' }]}>Сообщество</Text>
          </Pressable>
          <SF name="square.and.arrow.up" size={20} color="#fff" />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, position: 'relative' }}>
          <View style={{ position: 'absolute', right: 8, top: -6, opacity: 0.18 }}>
            <SF name={meta.icon} size={120} color="#fff" />
          </View>
          <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="calendar" size={11} color="#fff" />Старт {meta.startLabel}</Capsule>
          <Text style={[ty.largeTitle, { color: '#fff', marginTop: 12 }]}>{meta.title}</Text>
          <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]}>{meta.durationDays} дней · 3 категории · {meta.maxFlags} 🚩 — вылет</Text>
        </View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 90 }}>

        {/* Countdown */}
        <View style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: T.cardBg, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <View style={{ alignItems: 'center', minWidth: 86 }}>
            <Text style={[ty.largeTitle, { color: T.brand }]}>{left}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>дней до старта</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Row icon="calendar" label="Старт" value={meta.startLabel} />
            <Row icon="flame.fill" label="Длительность" value={`${meta.durationDays} дней`} />
            <Row icon="person.3.fill" label="Заявок" value={`${meta.participants}`} />
          </View>
        </View>

        {/* Categories + scoring */}
        <ListSection header="Категории и баллы">
          {CHALLENGE_CATEGORIES.map((cat, i) => (
            <View key={cat.key} style={{ flexDirection: 'row', gap: 12, padding: 14, position: 'relative' }}>
              <IconSquircle icon={cat.icon} bg={cat.color} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[ty.headline, { color: T.label }]}>{cat.title} <Text style={[ty.caption1, { color: T.labelTertiary }]}>· {cat.key}</Text></Text>
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]}>{cat.norm}</Text>
                <Text style={[ty.caption1, { color: cat.color, marginTop: 3 }]}>{cat.scoring}</Text>
              </View>
              {i < CHALLENGE_CATEGORIES.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 62, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
            </View>
          ))}
        </ListSection>

        {/* Activity conversions */}
        <ListSection header="Пересчёт активности в шаги" footer="Минимум 5 000 шагов нужно «набрать» аэробной нагрузкой.">
          <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {ACTIVITY_CONVERSIONS.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: i < ACTIVITY_CONVERSIONS.length - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
                <Text style={[ty.body, { color: T.label }]}>{a.label}</Text>
                <Text style={[ty.subhead, { color: T.labelSecondary }]}>{a.value}</Text>
              </View>
            ))}
          </View>
        </ListSection>

        {/* Teams */}
        <ListSection header={`Команды · нужно ещё ${CHALLENGE_TEAMS.reduce((s, t) => s + Math.max(0, t.capacity - t.members), 0)} человек`}>
          {CHALLENGE_TEAMS.map((t, i) => {
            const need = Math.max(0, t.capacity - t.members);
            const full = need === 0;
            return (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, position: 'relative' }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <SF name="person.3.fill" size={20} color={T.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ty.headline, { color: T.label }]}>{t.name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>Капитан: {t.captain} · советники: {t.advisors.join(', ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[ty.subheadEm, { color: full ? T.green : T.label }]}>{t.members}/{t.capacity}</Text>
                  <Text style={[ty.caption2, { color: full ? T.green : T.orange }]}>{full ? 'набрана' : `нужно ${need}`}</Text>
                </View>
                {i < CHALLENGE_TEAMS.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 70, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
              </View>
            );
          })}
        </ListSection>

        {/* Rules */}
        <ListSection header="Правила">
          <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
            {CHALLENGE_RULES.map((rule, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: i < CHALLENGE_RULES.length - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
                <Text style={[ty.subheadEm, { color: T.brand, width: 18 }]}>{i + 1}</Text>
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{rule}</Text>
              </View>
            ))}
          </View>
        </ListSection>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* CTA */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: 'rgba(249,249,249,0.96)', borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label="Подать заявку" icon="paperplane.fill" onPress={() => navigation.navigate('JoinChallenge', { challengeId })} />
      </View>
    </View>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SF name={icon} size={14} color={T.labelSecondary} />
      <Text style={[ty.subhead, { color: T.labelSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[ty.subheadEm, { color: T.label }]}>{value}</Text>
    </View>
  );
}

// ─── Active challenge (daily tracker) ──────────────────────────────
function ActiveChallenge({ navigation }: { navigation: Props['navigation'] }) {
  const { challenge, setMetric, toggleBinary, pointsToday, bonusToday, leaderboard, myRank, teamPoints } = useChallenge();
  const c = challenge;
  const ringPct = c.currentDay / c.totalDays;
  const r = 47;
  const circ = 2 * Math.PI * r;

  return (
    <Screen tabPadding={false} topInset={false}>
      <BackNav back="Сообщество" onBack={() => navigation.goBack()} trailing={<SF name="ellipsis" size={20} color={T.brandAccent} />} />

      <View style={{ padding: 20, paddingBottom: 16 }}>
        <Capsule bg={T.brandTinted} color={T.brand}><SF name="flag.fill" size={11} color={T.brand} />День {c.currentDay} из {c.totalDays}</Capsule>
        <Text style={[ty.largeTitle, { color: T.label, marginTop: 12 }]}>{c.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>Команда «{c.teamName}» · {c.members} участников · {c.startedLabel}</Text>
      </View>

      <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: T.cardBg, borderRadius: 14, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <View style={{ width: 110, height: 110 }}>
          <Svg width={110} height={110} viewBox="0 0 110 110">
            <Circle cx={55} cy={55} r={r} fill="none" stroke={T.fillTertiary} strokeWidth={8} />
            <Circle cx={55} cy={55} r={r} fill="none" stroke={T.brand} strokeWidth={8}
              strokeDasharray={`${ringPct * circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 55 55)" />
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

      <ListSection header="Календарь">
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: c.totalDays }, (_, i) => {
              const done = i < c.currentDay;
              const today = i === c.currentDay - 1;
              return (
                <View key={i} style={{ width: '12%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? T.brand : T.fillTertiary, borderWidth: today ? 2 : 0, borderColor: T.orange }}>
                  <Text style={[ty.caption2Em, { color: done ? '#fff' : T.labelSecondary }]}>{i + 1}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ListSection>

      <ListSection header={`Сегодня · день ${c.currentDay}`} footer={`Бонусы за превышение нормы идут команде. +${pointsToday} pts сегодня${bonusToday > 0 ? ` (включая +${bonusToday} бонусных)` : ''}.`}>
        <View style={{ paddingHorizontal: 16 }}>
          {c.tasks.map((t, i) => (
            <ChallengeTaskRow key={t.id} task={t} divider={i < c.tasks.length - 1}
              onToggle={() => toggleBinary(t.id)}
              onAdjust={t.kind === 'metric' ? (d) => setMetric(t.id, t.current + d) : undefined}
              step={t.kind === 'metric' ? (t.id === 'steps' ? 500 : 1) : 1} />
          ))}
        </View>
      </ListSection>

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
