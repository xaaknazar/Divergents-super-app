import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, ScrollView, Pressable, Animated, ActivityIndicator, Modal, Share, ActionSheetIOS, Platform, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Logo } from '../../components/Logo';
import { Capsule, ListSection, ListRow, PrimaryButton, IconSquircle, ProgressBar, ty } from '../../components/ui';
import { ChallengeTaskRow } from '../../components/ChallengeTaskRow';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { hSuccess } from '../../lib/haptics';
import { useChallenge } from '../../state/ChallengeContext';
import { useActivities } from '../../state/ActivityContext';
import { useAuth } from '@clerk/clerk-expo';
import { useRole } from '../../state/useRole';
import { deleteChallenge } from '../../data/api';
import {
  MEDAL_FOR_RANK, fetchChallengesAndTeams, getChallengeMeta, daysUntil, teamsNeed,
  CHALLENGE_CATEGORIES, CHALLENGE_RULES, ACTIVITY_CONVERSIONS, ChallengeListItem, ChallengeTeam, taskDone,
  FlagCounts, totalFlags, ChallengeTask,
  fetchMyChallengeApplications, MyChallengeApplication,
} from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeDetail'>;

export function ChallengeDetailScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const challengeId = route.params?.challengeId ?? '';
  const { challenge: active } = useChallenge();
  const [list, setList] = useState<ChallengeListItem[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const { challenges, error: err } = await fetchChallengesAndTeams();
    setList(challenges);
    setError(err);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { challenges, error: err } = await fetchChallengesAndTeams();
      if (!alive) return;
      setList(challenges);
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
        <NavHeader backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      </View>
    );
  }

  const meta = getChallengeMeta(list, challengeId);
  if (meta && meta.status === 'upcoming') {
    return <UpcomingChallenge meta={meta} teams={meta.teamList} navigation={navigation} />;
  }
  // A server-side active challenge (matched by id) opens the daily tracker.
  if (meta) return <ActiveChallenge navigation={navigation} />;

  // Unknown id: distinguish a load failure (retry) from a genuinely missing one.
  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} />
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
  const { canCreate } = useRole();
  const { getToken, userId } = useAuth();
  // Reviewers: admins/creators, plus a captain of any team in this challenge.
  const isCaptainHere = teams.some((t) => t.captainId && t.captainId === userId);
  const canReview = canCreate || isCaptainHere;

  // The user's own application to THIS challenge (undefined = loading). Drives the
  // CTA: apply once; can't change while pending/approved; re-apply after rejection.
  const [myApp, setMyApp] = useState<MyChallengeApplication | null | undefined>(undefined);
  const loadMyApp = useCallback(async () => {
    const token = await getToken();
    const apps = await fetchMyChallengeApplications(token);
    setMyApp(apps.find((a) => a.challengeId === meta.id) ?? null);
  }, [meta.id]);
  // Refresh on focus so the CTA updates right after applying (returns from JoinChallenge).
  useFocusEffect(React.useCallback(() => { loadMyApp(); }, [loadMyApp]));

  // Creator/admin: delete the challenge (double-confirmed; irreversible).
  const confirmDelete = () => {
    Alert.alert('Удалить челлендж?', `«${meta.title}» и все заявки будут удалены безвозвратно.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        const token = await getToken();
        const ok = await deleteChallenge(token, meta.id);
        if (ok) { hSuccess(); navigation.navigate('CommunityHome', { refresh: Date.now(), focus: 'challenge' }); }
        else Alert.alert('Не удалось удалить', 'Проверьте подключение и права (нужен создатель/админ).');
      } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      {/* Gradient hero background */}
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <NavHeader
          transparent tint="#fff" backLabel={tr('Сообщество')} onBack={() => navigation.goBack()}
          trailing={canCreate
            ? <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Удалить челлендж"><SF name="trash.fill" size={19} color="#fff" /></Pressable>
            : <SF name="square.and.arrow.up" size={20} color="#fff" />}
        />
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, position: 'relative' }}>
          <View style={{ position: 'absolute', right: 8, top: -6, opacity: 0.18 }}>
            <SF name={meta.icon} size={120} color="#fff" />
          </View>
          <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="calendar" size={11} color="#fff" />{tr('Старт')} {meta.startLabel}</Capsule>
          <Text style={[ty.largeTitle, { color: '#fff', marginTop: 12 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{meta.title}</Text>
          <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{meta.durationDays} дней · 3 категории · {meta.maxFlags} 🚩 — вылет</Text>
        </View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 90 }}>

        {/* Countdown */}
        <View style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: T.cardBg, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <View style={{ alignItems: 'center', minWidth: 86 }}>
            <Text style={[ty.largeTitle, { color: T.brand }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{left}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('дней до старта')}</Text>
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
                <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{cat.title} <Text style={[ty.caption1, { color: T.labelTertiary }]}>· {cat.key}</Text></Text>
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
                <Text style={[ty.body, { color: T.label, flex: 1 }]} numberOfLines={1}>{a.label}</Text>
                <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{a.value}</Text>
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
                  <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{tr('Капитан:')} {t.captain}{t.advisors.length ? ` · ${tr('советники:')} ${t.advisors.join(', ')}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[ty.subheadEm, { color: full ? T.emeraldText : T.label }]} numberOfLines={1}>{t.members}/{t.capacity}</Text>
                  <Text style={[ty.caption2, { color: full ? T.emeraldText : T.orange }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{full ? 'набрана' : `нужно ${need}`}</Text>
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
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator, gap: 10 }}>
        {canReview ? (
          <Pressable onPress={() => navigation.navigate('ChallengeApplicants', { challengeId: meta.id })}
            style={{ height: 48, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="person.2.fill" size={16} color={T.brand} />
            <Text style={[ty.headline, { color: T.brand }]}>{canCreate ? 'Заявки (все команды)' : 'Заявки моей команды'}</Text>
          </Pressable>
        ) : null}

        {/* Applicant CTA — one application; can re-apply only after a rejection. */}
        {myApp?.status === 'approved' ? (
          <View style={{ height: 50, borderRadius: 14, backgroundColor: 'rgba(52,199,89,0.14)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="checkmark.circle.fill" size={18} color={T.green} />
            <Text style={[ty.headline, { color: T.green }]}>Вы в команде{myApp.teamName ? ` «${myApp.teamName}»` : ''}</Text>
          </View>
        ) : myApp?.status === 'pending' ? (
          <View style={{ height: 50, borderRadius: 14, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="clock.fill" size={16} color={T.labelSecondary} />
            <Text style={[ty.headline, { color: T.labelSecondary }]}>Заявка на рассмотрении</Text>
          </View>
        ) : (
          <>
            {myApp?.status === 'rejected' && myApp.feedback ? (
              <Text style={[ty.caption1, { color: T.red, textAlign: 'center' }]} numberOfLines={2}>Отклонено: {myApp.feedback}</Text>
            ) : null}
            <PrimaryButton
              label={myApp?.status === 'rejected' ? tr('Подать заявку заново') : tr('Подать заявку')}
              icon="paperplane.fill"
              onPress={() => navigation.navigate('JoinChallenge', { challengeId: meta.id })}
            />
          </>
        )}
      </View>
    </View>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  const { T } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SF name={icon} size={14} color={T.labelSecondary} />
      <Text style={[ty.subhead, { color: T.labelSecondary, flex: 1 }]} numberOfLines={1}>{label}</Text>
      <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Active challenge (daily tracker) ──────────────────────────────
function ActiveChallenge({ navigation }: { navigation: Props['navigation'] }) {
  const { T } = useTheme();
  const { challenge, setMetric, toggleBinary, pointsToday, bonusToday, leaderboard, myRank, teamPoints, teamFlags, teamPenalty, reportedToday, reportedAt, submitReport } = useChallenge();
  const { weekly, workouts } = useActivities();
  const c = challenge;
  const insets = useSafeAreaInsets();
  const allDone = c.tasks.every(taskDone);
  const [celebrate, setCelebrate] = useState(false);
  const [showConv, setShowConv] = useState(false);
  const myFlags = c.flags;
  const myEliminated = c.eliminated === true;
  const prevDone = useRef(allDone);
  const cel = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (allDone && !prevDone.current) { setCelebrate(true); hSuccess(); setTimeout(() => setCelebrate(false), 2600); }
    prevDone.current = allDone;
  }, [allDone]);
  useEffect(() => { Animated.spring(cel, { toValue: celebrate ? 1 : 0, useNativeDriver: true, speed: 14, bounciness: 8 }).start(); }, [celebrate]);
  const ringPct = c.totalDays > 0 ? c.currentDay / c.totalDays : 0;
  const finished = c.currentDay >= c.totalDays && c.totalDays > 0;
  // Today == challenge day `currentDay`, so we can label every calendar cell with
  // its real date by offsetting from now — no server start-date needed.
  const anchor = new Date();
  const todayLabel = anchor.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  // Manual entry for metric tasks (steps / pages): tap the value → type it.
  const promptSet = (t: ChallengeTask) => {
    if (t.kind !== 'metric') return;
    if (Platform.OS === 'ios' && typeof (Alert as any).prompt === 'function') {
      (Alert as any).prompt(t.title, `${tr('Введите значение')} (${t.unit})`, [
        { text: tr('Отмена'), style: 'cancel' },
        { text: tr('Сохранить'), onPress: (txt: string) => { const n = parseInt(String(txt ?? '').replace(/[^\d]/g, ''), 10); if (!isNaN(n)) setMetric(t.id, n); } },
      ], 'plain-text', String(t.current), 'number-pad');
    }
  };

  // "Покинуть челлендж" gate: you can only leave AFTER it ends, or when the team
  // captain raises a white flag 🏳️ for a valid reason (captain-side, server).
  const attemptLeave = () => {
    if (myEliminated) { Alert.alert(tr('Вы уже вне челленджа'), tr('Ваши очки зафиксированы до конца сезона.')); return; }
    if (!finished) {
      Alert.alert(
        tr('Пока нельзя выйти'),
        tr('Покинуть челлендж можно только после его завершения — или если капитан команды поднимет белый флаг 🏳️ по уважительной причине.'),
        [{ text: tr('Понятно'), style: 'cancel' }],
      );
      return;
    }
    Alert.alert(tr('Челлендж завершён'), tr('Спасибо за участие! Теперь можно покинуть команду.'), [{ text: tr('Ок'), style: 'cancel' }]);
  };

  const openMenu = () => {
    const share = () => Share.share({ message: `${c.title} — Divergents. ${tr('День')} ${c.currentDay}/${c.totalDays}.` }).catch(() => {});
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [tr('Отмена'), tr('Как засчитать активность'), tr('Поделиться'), tr('Покинуть челлендж')],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (i) => { if (i === 1) setShowConv(true); else if (i === 2) share(); else if (i === 3) attemptLeave(); },
      );
    } else {
      Alert.alert(c.title, undefined, [
        { text: tr('Как засчитать активность'), onPress: () => setShowConv(true) },
        { text: tr('Поделиться'), onPress: share },
        { text: tr('Покинуть челлендж'), style: 'destructive', onPress: attemptLeave },
        { text: tr('Отмена'), style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} trailing={(
        <Pressable onPress={openMenu} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Меню челленджа')}>
          <SF name="ellipsis" size={20} color={T.brandAccent} />
        </Pressable>
      )} />
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
          <Text style={[ty.largeTitle, { color: T.label, flex: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{c.title}</Text>
        </View>
        {c.teamName ? <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]} numberOfLines={1}>{tr('Команда')} «{c.teamName}» · {c.members} {tr('участников')}{c.startedLabel ? ` · ${c.startedLabel}` : ''}</Text> : null}
      </View>

      {/* Elimination banner — points are frozen for the user (🏳️) */}
      {myEliminated ? (
        <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(255,59,48,0.10)', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0.5, borderColor: 'rgba(255,59,48,0.25)' }}>
          <Text style={{ fontSize: 24 }}>🏳️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.red }]}>{tr('Вы выбыли из челленджа')}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{tr('Набрано 3 🚩 в одной категории. Очки зафиксированы.')}</Text>
          </View>
        </View>
      ) : null}

      {/* The user's own per-category flag counts */}
      {myFlags && totalFlags(myFlags) > 0 ? (
        <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: T.cardBg, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <Text style={[ty.footnoteEm, { color: T.labelSecondary, marginBottom: 10 }]}>{tr('Мои флаги')} 🚩</Text>
          <MyFlagRow flags={myFlags} />
        </View>
      ) : null}

      <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: T.cardBg, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: T.cardBorder }}>
        <View style={{ flexDirection: 'row' }}>
          {[
            { v: `${c.currentDay}/${c.totalDays}`, l: tr('Дней') },
            { v: `${Math.round(ringPct * 100)}%`, l: tr('Прогресс') },
            { v: `${teamPoints}`, l: tr('Очки команды') },
          ].map((st, i, arr) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < arr.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              <Text style={[ty.title2, { color: T.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{st.v}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{st.l}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 16 }}><ProgressBar value={ringPct} height={6} /></View>
      </View>

      <ListSection header={tr('Календарь')} footer={`${tr('Сегодня')}: ${todayLabel} · ${tr('день')} ${c.currentDay} ${tr('из')} ${c.totalDays}`}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: c.totalDays }, (_, i) => {
            const done = i < c.currentDay;
            const today = i === c.currentDay - 1;
            const cellDate = new Date(anchor);
            cellDate.setDate(anchor.getDate() + (i - (c.currentDay - 1)));
            return (
              <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 4 }}>
                <View style={{ flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? T.brand : (today ? T.brandTinted : T.fillTertiary), borderWidth: today ? 2 : 0, borderColor: T.orange }}>
                  <Text style={[ty.footnoteEm, { color: done ? '#fff' : (today ? T.brand : T.label) }]}>{cellDate.getDate()}</Text>
                  <Text style={[ty.caption2, { color: done ? 'rgba(255,255,255,0.85)' : T.labelTertiary, marginTop: 1 }]} numberOfLines={1}>{tr('Д')}{i + 1}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ListSection>

      {/* My activity — Strava-style dynamics + record a run/walk on the map */}
      <ListSection header={tr('Моя активность')} footer={tr('Маршрут пишется на карте; шаги можно добавить в челлендж.')}>
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 }}>
            {weekly.map((d, i) => {
              const max = Math.max(1, ...weekly.map((x) => x.steps));
              const h = 6 + (d.steps / max) * 46;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ width: '68%', height: h, borderRadius: 5, backgroundColor: d.steps > 0 ? (d.isToday ? T.brand : T.brandTinted) : T.fillTertiary }} />
                  <Text style={[ty.caption2, { color: d.isToday ? T.brand : T.labelTertiary }]} numberOfLines={1}>{d.label}</Text>
                </View>
              );
            })}
          </View>
          <Pressable onPress={() => navigation.navigate('WorkoutTrack', { challengeId: c.id })}
            style={{ marginTop: 14, height: 48, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="figure.run" size={18} color="#fff" />
            <Text style={[ty.headline, { color: '#fff' }]}>{tr('Записать пробежку / ходьбу')}</Text>
          </Pressable>
        </View>
        {workouts.slice(0, 3).map((w, i, arr) => {
          const km = (w.distanceM / 1000).toFixed(2);
          const dt = new Date(w.dateISO);
          const when = isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
          return (
            <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, position: 'relative' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                <SF name={w.type === 'run' ? 'figure.run' : 'figure.walk'} size={18} color={T.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{w.type === 'run' ? tr('Бег') : tr('Ходьба')} · {km} км</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{when} · {Math.round(w.durationSec / 60)} {tr('мин')}</Text>
              </View>
              <Text style={[ty.subheadEm, { color: T.brand }]}>+{w.steps}</Text>
              {i < arr.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 64, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
            </View>
          );
        })}
      </ListSection>

      <ListSection header={`${tr('Сегодня · день')} ${c.currentDay}`} footer={`${tr('Бонусы за превышение нормы идут команде.')} +${pointsToday} pts ${tr('сегодня')}${bonusToday > 0 ? ` (${tr('включая')} +${bonusToday} ${tr('бонусных')})` : ''}.`}>
        <View style={{ paddingHorizontal: 16 }}>
          {c.tasks.map((t, i) => (
            <ChallengeTaskRow key={t.id} task={t} divider={i < c.tasks.length - 1}
              onToggle={() => toggleBinary(t.id)}
              onAdjust={t.kind === 'metric' && !isActivityTask(t) ? (d) => setMetric(t.id, t.current + d) : undefined}
              onSet={t.kind === 'metric' ? () => promptSet(t) : undefined}
              step={1} />
          ))}
          {/* Activity step-conversions reference (бег / плавание / силовые…) */}
          <Pressable onPress={() => setShowConv(true)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
            <SF name="info.circle" size={16} color={T.brand} />
            <Text style={[ty.subhead, { color: T.brand, flex: 1 }]} numberOfLines={1}>{tr('Как засчитать активность в шагах?')}</Text>
            <SF name="chevron.right" size={13} color={T.labelTertiary} />
          </Pressable>

          {/* Daily report — отчёт за день до 23:00 (сервер решает on-time/late) */}
          {c.currentDay > 0 && !finished && !myEliminated ? (
            <View style={{ borderTopWidth: 0.5, borderTopColor: T.separator, paddingTop: 4 }}>
              <DailyReport reported={reportedToday} reportedAt={reportedAt} onSubmit={submitReport} />
            </View>
          ) : null}
        </View>
      </ListSection>

      <ListSection header={c.teamName ? `Команда «${c.teamName}» · вы ${myRank}-е место` : tr('Команда')}>
        {leaderboard.length === 0 ? (
          <View style={{ padding: 18, alignItems: 'center' }}>
            <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{tr('Команда ещё формируется.')}</Text>
          </View>
        ) : (
          <>
            <TeamSummary points={teamPoints} flags={teamFlags} penalty={teamPenalty} />
            {leaderboard.map((row, i) => {
          const medal = MEDAL_FOR_RANK(row.rank);
          const out = row.eliminated === true;
          const flagN = totalFlags(row.flags);
          return (
            <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: row.isMe ? T.brandTinted : 'transparent', opacity: out ? 0.6 : 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: out ? T.labelTertiary : T.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.subheadEm, { color: '#fff' }]}>{out ? '🏳️' : row.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>
                  {row.name}{out ? <Text style={[ty.caption1, { color: T.red }]}>{`  · ${tr('выбыл')}`}</Text> : null}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 1 }}>
                  <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('День')} {row.day} · {row.points} pts</Text>
                  {flagN > 0 && row.flags ? (
                    <Text style={[ty.caption1, { color: T.red }]}>{`  · 🚩 R${row.flags.R} NS${row.flags.NS} A${row.flags.A}`}</Text>
                  ) : null}
                  {row.penalty ? (
                    <Text style={[ty.caption1, { color: T.red }]}>{`  · штраф ${row.penalty}`}</Text>
                  ) : null}
                </View>
              </View>
              {out
                ? <Text style={{ fontSize: 16 }}>🏳️</Text>
                : medal ? <SF name={medal.icon} size={16} color={medal.color} /> : <SF name="flame.fill" size={14} color={T.orange} />}
              {i < leaderboard.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 64, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
            </View>
          );
            })}
          </>
        )}
      </ListSection>

      {/* Activity step-conversions sheet (from the Divergents rules) */}
      <Modal visible={showConv} transparent animationType="slide" onRequestClose={() => setShowConv(false)}>
        <Pressable onPress={() => setShowConv(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: T.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 20 }}>
            <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillTertiary, marginBottom: 14 }} />
            <Text style={[ty.title3, { color: T.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Пересчёт активности в шаги')}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4, marginBottom: 8 }]}>{tr('Минимум 5 000 шагов нужно набрать аэробной нагрузкой. 400 шагов = 1 балл.')}</Text>
            {ACTIVITY_CONVERSIONS.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < ACTIVITY_CONVERSIONS.length - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
                <Text style={[ty.body, { color: T.label, flex: 1 }]} numberOfLines={1}>{a.label}</Text>
                <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{a.value}</Text>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ height: 30 }} />
      </Screen>
    </View>
  );
}

// Daily report bar — «отчёт за день» с дедлайном 23:00. Клиент показывает
// обратный отсчёт и статус; сервер решает, вовремя отчёт или просрочен (−300 и 🚩).
function DailyReport({ reported, reportedAt, onSubmit }: { reported: boolean; reportedAt: string | null; onSubmit: () => Promise<boolean> }) {
  const { T } = useTheme();
  const [busy, setBusy] = useState(false);

  if (reported) {
    const at = reportedAt ? new Date(reportedAt) : null;
    const hhmm = at && !isNaN(at.getTime()) ? at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(52,199,89,0.12)', borderRadius: 12, padding: 12 }}>
        <SF name="checkmark.circle.fill" size={20} color={T.green} />
        <Text style={[ty.subheadEm, { color: T.green, flex: 1 }]} numberOfLines={1}>{tr('Отчёт за день отправлен')}{hhmm ? ` · ${hhmm}` : ''}</Text>
      </View>
    );
  }

  const now = new Date();
  const deadline = new Date(now); deadline.setHours(23, 0, 0, 0);
  const late = now.getTime() > deadline.getTime();
  const msLeft = deadline.getTime() - now.getTime();
  const hLeft = Math.max(0, Math.floor(msLeft / 3600000));
  const mLeft = Math.max(0, Math.floor((msLeft % 3600000) / 60000));

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await onSubmit();
    setBusy(false);
    if (ok) hSuccess();
    else Alert.alert(tr('Не удалось отправить отчёт'), tr('Проверьте подключение и попробуйте снова.'));
  };

  return (
    <View style={{ marginTop: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SF name="clock.fill" size={14} color={late ? T.red : T.labelSecondary} />
        <Text style={[ty.caption1, { color: late ? T.red : T.labelSecondary, flex: 1 }]}>
          {late
            ? tr('Дедлайн 23:00 прошёл — отчёт зачтётся как просроченный (−300 и 🚩)')
            : `${tr('До дедлайна отчёта (23:00)')}: ${hLeft} ч ${mLeft} мин`}
        </Text>
      </View>
      <Pressable onPress={submit} disabled={busy} accessibilityRole="button" accessibilityLabel={tr('Отправить отчёт за день')}
        style={{ height: 48, borderRadius: 14, backgroundColor: late ? T.red : T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: busy ? 0.6 : 1 }}>
        <SF name="paperplane.fill" size={17} color="#fff" />
        <Text style={[ty.headline, { color: '#fff' }]}>{busy ? tr('Отправка…') : tr('Отправить отчёт за день')}</Text>
      </Pressable>
    </View>
  );
}

// Team-wide totals visible to EVERY member: накопленные баллы + штрафы (🚩 / очки).
function TeamSummary({ points, flags, penalty }: { points: number; flags: number; penalty: number }) {
  const { T } = useTheme();
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
      <View style={{ flex: 1 }}>
        <Text style={[ty.caption2, { color: T.labelSecondary }]} numberOfLines={1}>{tr('Накоплено командой')}</Text>
        <Text style={[ty.title3, { color: T.brand, marginTop: 2 }]} numberOfLines={1}>{points} pts</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={[ty.caption2, { color: T.labelSecondary }]} numberOfLines={1}>{tr('Штрафы команды')}</Text>
        <Text style={[ty.title3, { color: flags > 0 || penalty < 0 ? T.red : T.label, marginTop: 2 }]} numberOfLines={1}>
          {flags} 🚩{penalty < 0 ? ` · ${penalty}` : ''}
        </Text>
      </View>
    </View>
  );
}

// The activity (steps) metric task — used to pick a larger stepper and to anchor
// the conversions reference. Matches the local 'steps' id or a server steps unit.
function isActivityTask(t: ChallengeTask): boolean {
  if (t.kind !== 'metric') return false;
  return t.id === 'steps' || /^(a|activity)$/i.test(t.id) || /шаг/i.test(t.unit);
}

// The user's own per-category 🚩 counts (R / NS / A), tinted per category.
function MyFlagRow({ flags }: { flags: FlagCounts }) {
  const { T } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {CHALLENGE_CATEGORIES.map((cat) => {
        const n = flags[cat.key];
        const danger = n >= 3;
        return (
          <View key={cat.key} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: T.fillTertiary, borderWidth: danger ? 1 : 0, borderColor: T.red }}>
            <SF name={cat.icon} size={16} color={danger ? T.red : cat.color} />
            <Text style={[ty.title3, { color: danger ? T.red : T.label, marginTop: 4 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{`${n} 🚩`}</Text>
            <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{cat.title}</Text>
          </View>
        );
      })}
    </View>
  );
}
