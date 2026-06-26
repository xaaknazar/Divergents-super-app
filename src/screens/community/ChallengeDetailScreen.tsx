import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, ScrollView, Pressable, Animated, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/Screen';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Logo } from '../../components/Logo';
import { Capsule, ListSection, ListRow, PrimaryButton, IconSquircle, ProgressBar, ty } from '../../components/ui';
import { ChallengeTaskRow } from '../../components/ChallengeTaskRow';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { hSuccess } from '../../lib/haptics';
import { useChallenge } from '../../state/ChallengeContext';
import {
  MEDAL_FOR_RANK, fetchChallengesAndTeams, getChallengeMeta, daysUntil, teamsNeed,
  CHALLENGE_CATEGORIES, CHALLENGE_RULES, ACTIVITY_CONVERSIONS, ChallengeListItem, ChallengeTeam, taskDone,
} from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeDetail'>;

export function ChallengeDetailScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const challengeId = route.params?.challengeId ?? '';
  const { challenge: active } = useChallenge();
  const [list, setList] = useState<ChallengeListItem[] | null>(null);
  const [teams, setTeams] = useState<ChallengeTeam[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const { challenges, teams: tms, error: err } = await fetchChallengesAndTeams();
    setList(challenges);
    setTeams(tms);
    setError(err);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { challenges, teams: tms, error: err } = await fetchChallengesAndTeams();
      if (!alive) return;
      setList(challenges);
      setTeams(tms);
      setError(err);
    })();
    return () => { alive = false; };
  }, []);

  // The active/daily tracker is local state — always available, even offline.
  const isActive = challengeId === active.id;
  if (isActive) return <ActiveChallenge navigation={navigation} />;

  if (list === null) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back={tr('Сообщество')} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      </View>
    );
  }

  const meta = getChallengeMeta(list, challengeId);
  if (meta && meta.status === 'upcoming') {
    return <UpcomingChallenge meta={meta} teams={teams} navigation={navigation} />;
  }
  // A server-side active challenge (matched by id) opens the daily tracker.
  if (meta) return <ActiveChallenge navigation={navigation} />;

  // Unknown id: distinguish a load failure (retry) from a genuinely missing one.
  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={tr('Сообщество')} onBack={() => navigation.goBack()} />
      {error
        ? <ErrorState onRetry={load} />
        : <EmptyState icon="flag.fill" title={tr('Челлендж не найден')} subtitle={tr('Возможно, он завершился или ещё не опубликован.')} actionLabel={tr('Назад')} onAction={() => navigation.goBack()} />}
    </View>
  );
}

// ─── Upcoming challenge — rules, teams, join ──────────────
function UpcomingChallenge({ meta, teams, navigation }: { meta: ChallengeListItem; teams: ChallengeTeam[]; navigation: Props['navigation'] }) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const left = daysUntil(meta.startISO);

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      {/* Gradient hero background */}
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6 }}>
            <SF name="chevron.left" size={20} color="#fff" />
            <Text style={[ty.body, { color: '#fff' }]}>{tr('Сообщество')}</Text>
          </Pressable>
          <SF name="square.and.arrow.up" size={20} color="#fff" />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, position: 'relative' }}>
          <View style={{ position: 'absolute', right: 8, top: -6, opacity: 0.18 }}>
            <SF name={meta.icon} size={120} color="#fff" />
          </View>
          <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="calendar" size={11} color="#fff" />{tr('Старт')} {meta.startLabel}</Capsule>
          <Text style={[ty.largeTitle, { color: '#fff', marginTop: 12 }]}>{meta.title}</Text>
          <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]}>{meta.durationDays} дней · 3 категории · {meta.maxFlags} 🚩 — вылет</Text>
        </View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 90 }}>

        {/* Countdown */}
        <View style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: T.cardBg, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <View style={{ alignItems: 'center', minWidth: 86 }}>
            <Text style={[ty.largeTitle, { color: T.brand }]}>{left}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('дней до старта')}</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Row icon="calendar" label={tr('Старт')} value={meta.startLabel} />
            <Row icon="flame.fill" label={tr('Длительность')} value={`${meta.durationDays} дней`} />
            <Row icon="person.3.fill" label={tr('Заявок')} value={`${meta.participants}`} />
          </View>
        </View>

        {/* Categories + scoring */}
        <ListSection header={tr('Категории и баллы')}>
          {CHALLENGE_CATEGORIES.map((cat, i) => (
            <View key={cat.key} style={{ flexDirection: 'row', gap: 12, padding: 14, position: 'relative' }}>
              <IconSquircle icon={cat.icon} bg={cat.color} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[ty.headline, { color: T.label }]}>{cat.title} <Text style={[ty.caption1, { color: T.labelTertiary }]}>· {cat.key}</Text></Text>
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 1 }]}>{cat.norm}</Text>
                <Text style={[ty.caption1, { color: T.label, marginTop: 3 }]}>{cat.scoring}</Text>
              </View>
              {i < CHALLENGE_CATEGORIES.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 62, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
            </View>
          ))}
        </ListSection>

        {/* Activity conversions */}
        <ListSection header={tr('Пересчёт активности в шаги')} footer="Минимум 5 000 шагов нужно «набрать» аэробной нагрузкой.">
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
        <ListSection header={teams.length > 0 ? `Команды · нужно ещё ${teamsNeed(teams)} человек` : tr('Команды')}>
          {teams.length === 0 ? (
            <View style={{ padding: 18, alignItems: 'center' }}>
              <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{tr('Команды пока не сформированы.')}</Text>
            </View>
          ) : teams.map((t, i) => {
            const need = Math.max(0, t.capacity - t.members);
            const full = need === 0;
            return (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, position: 'relative' }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <SF name="person.3.fill" size={20} color={T.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ty.headline, { color: T.label }]}>{t.name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{tr('Капитан:')} {t.captain} · {tr('советники:')} {t.advisors.join(', ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[ty.subheadEm, { color: full ? T.emeraldText : T.label }]}>{t.members}/{t.capacity}</Text>
                  <Text style={[ty.caption2, { color: full ? T.emeraldText : '#A85D00' }]}>{full ? 'набрана' : `нужно ${need}`}</Text>
                </View>
                {i < teams.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 70, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
              </View>
            );
          })}
        </ListSection>

        {/* Rules */}
        <ListSection header={tr('Правила')}>
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
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label={tr('Подать заявку')} icon="paperplane.fill" onPress={() => navigation.navigate('JoinChallenge', { challengeId: meta.id })} />
      </View>
    </View>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  const { T } = useTheme();
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
  const { T } = useTheme();
  const { challenge, setMetric, toggleBinary, pointsToday, bonusToday, leaderboard, myRank, teamPoints } = useChallenge();
  const c = challenge;
  const insets = useSafeAreaInsets();
  const allDone = c.tasks.every(taskDone);
  const [celebrate, setCelebrate] = useState(false);
  const prevDone = useRef(allDone);
  const cel = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (allDone && !prevDone.current) { setCelebrate(true); hSuccess(); setTimeout(() => setCelebrate(false), 2600); }
    prevDone.current = allDone;
  }, [allDone]);
  useEffect(() => { Animated.spring(cel, { toValue: celebrate ? 1 : 0, useNativeDriver: true, speed: 14, bounciness: 8 }).start(); }, [celebrate]);
  const ringPct = c.totalDays > 0 ? c.currentDay / c.totalDays : 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={tr('Сообщество')} onBack={() => navigation.goBack()} trailing={<SF name="ellipsis" size={20} color={T.brandAccent} />} />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 56, left: 0, right: 0, alignItems: 'center', zIndex: 20, opacity: cel, transform: [{ scale: cel.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
        <View style={{ backgroundColor: T.brand, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
          <Text style={{ fontSize: 18 }}>🎉</Text>
          <Text style={[ty.headline, { color: '#fff' }]}>{tr('День закрыт! Серия')} {c.currentDay} 🔥</Text>
        </View>
      </Animated.View>
      <Screen tabPadding={false} topInset={false}>

      <View style={{ padding: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Capsule bg={T.brandTinted} color={T.brand}><SF name="flag.fill" size={11} color={T.brand} />{tr('День')} {c.currentDay} {tr('из')} {c.totalDays}</Capsule>
          <Capsule bg="rgba(52,199,89,0.14)" color={T.green}><SF name="checkmark.seal.fill" size={11} color={T.green} />{tr('Бесплатно')}</Capsule>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <Logo size={26} />
          <Text style={[ty.largeTitle, { color: T.label, flex: 1 }]}>{c.title}</Text>
        </View>
        {c.teamName ? <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{tr('Команда')} «{c.teamName}» · {c.members} {tr('участников')}{c.startedLabel ? ` · ${c.startedLabel}` : ''}</Text> : null}
      </View>

      <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: T.cardBg, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: T.cardBorder }}>
        <View style={{ flexDirection: 'row' }}>
          {[
            { v: `${c.currentDay}/${c.totalDays}`, l: tr('Дней') },
            { v: `${Math.round(ringPct * 100)}%`, l: tr('Прогресс') },
            { v: `${teamPoints}`, l: tr('Очки команды') },
          ].map((st, i, arr) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < arr.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              <Text style={[ty.title2, { color: T.label }]}>{st.v}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{st.l}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 16 }}><ProgressBar value={ringPct} height={6} /></View>
      </View>

      <ListSection header={tr('Календарь')}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: c.totalDays }, (_, i) => {
            const done = i < c.currentDay;
            const today = i === c.currentDay - 1;
            return (
              <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 4 }}>
                <View style={{ flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? T.brand : T.fillTertiary, borderWidth: today ? 2 : 0, borderColor: T.orange }}>
                  <Text style={[ty.footnoteEm, { color: done ? '#fff' : T.labelSecondary }]}>{i + 1}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ListSection>

      <ListSection header={`${tr('Сегодня · день')} ${c.currentDay}`} footer={`${tr('Бонусы за превышение нормы идут команде.')} +${pointsToday} pts ${tr('сегодня')}${bonusToday > 0 ? ` (${tr('включая')} +${bonusToday} ${tr('бонусных')})` : ''}.`}>
        <View style={{ paddingHorizontal: 16 }}>
          {c.tasks.map((t, i) => (
            <ChallengeTaskRow key={t.id} task={t} divider={i < c.tasks.length - 1}
              onToggle={() => toggleBinary(t.id)}
              onAdjust={t.kind === 'metric' ? (d) => setMetric(t.id, t.current + d) : undefined}
              step={t.kind === 'metric' ? (t.id === 'steps' ? 500 : 1) : 1} />
          ))}
        </View>
      </ListSection>

      <ListSection header={c.teamName ? `Команда «${c.teamName}» · вы ${myRank}-е место` : tr('Команда')}>
        {leaderboard.length === 0 ? (
          <View style={{ padding: 18, alignItems: 'center' }}>
            <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{tr('Команда ещё формируется.')}</Text>
          </View>
        ) : leaderboard.map((row, i) => {
          const medal = MEDAL_FOR_RANK(row.rank);
          return (
            <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: row.isMe ? T.brandTinted : 'transparent' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.subheadEm, { color: '#fff' }]}>{row.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ty.body, { color: T.label }]}>{row.name}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('День')} {row.day} · {row.points} pts</Text>
              </View>
              {medal ? <SF name={medal.icon} size={16} color={medal.color} /> : <SF name="flame.fill" size={14} color={T.orange} />}
              {i < leaderboard.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 64, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
            </View>
          );
        })}
      </ListSection>

      <View style={{ height: 30 }} />
      </Screen>
    </View>
  );
}
