import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, ScrollView, Pressable, Animated, ActivityIndicator, Modal, ActionSheetIOS, Platform, Alert, Linking, TextInput, KeyboardAvoidingView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Logo } from '../../components/Logo';
import { Aurora } from '../../components/Aurora';
import { Capsule, ListSection, ListRow, PrimaryButton, IconSquircle, ty } from '../../components/ui';
import { ChallengeTaskRow } from '../../components/ChallengeTaskRow';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { hSuccess } from '../../lib/haptics';
import { useChallenge, RankedMember } from '../../state/ChallengeContext';
import { useAuth } from '@clerk/clerk-expo';
import { useRole } from '../../state/useRole';
import { deleteChallenge, withdrawChallengeApplication } from '../../data/api';
import {
  fetchChallengesAndTeams, getChallengeMeta, daysUntil, teamsNeed,
  CHALLENGE_CATEGORIES, CHALLENGE_RULES, ACTIVITY_CONVERSIONS, ChallengeListItem, ChallengeTeam, taskDone,
  FlagCounts, totalFlags, ChallengeTask, MetricTask, MemberTaskProgress,
  fetchMyChallengeApplications, MyChallengeApplication,
  setTeamChat, broadcastTeam,
} from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeDetail'>;

export function ChallengeDetailScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const challengeId = route.params?.challengeId ?? '';
  const { challenge: active, isParticipant, loading: activeLoading } = useChallenge();
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
  const isActive = isParticipant && challengeId === active.id;
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
  if (meta?.status === 'active' && activeLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      </View>
    );
  }
  // Daily tracking is private to accepted participants of the active challenge.
  if (meta?.status === 'active' && !isParticipant) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} />
        <EmptyState icon="lock.fill" title={tr('Доступ только участникам')} subtitle={tr('Активный план и результаты доступны участникам этого челленджа.')} actionLabel={tr('Назад')} onAction={() => navigation.goBack()} />
      </View>
    );
  }
  // A server-side active challenge (matched by id) opens the participant tracker.
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
  // All team spots taken → recruitment closed, waiting for the start.
  const full = teams.length > 0 && teamsNeed(teams) === 0;
  const [rulesOpen, setRulesOpen] = useState(false);
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

  // Applicant: withdraw a still-pending application. Once approved you're in the
  // team and can't withdraw — only the captain can remove you (server → 409).
  const [withdrawing, setWithdrawing] = useState(false);
  const confirmWithdraw = () => {
    Alert.alert('Отозвать заявку?', `Заявка в команду${myApp?.teamName ? ` «${myApp.teamName}»` : ''} будет отменена. Позже можно подать снова.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отозвать', style: 'destructive', onPress: async () => {
        setWithdrawing(true);
        const token = await getToken();
        const r = await withdrawChallengeApplication(token, meta.id);
        setWithdrawing(false);
        if (r.ok) { hSuccess(); loadMyApp(); }
        else if (r.reason === 'approved') { Alert.alert('Вы уже в команде', 'Отозвать нельзя — вас принял капитан. Выйти из команды можно только через капитана.'); loadMyApp(); }
        else Alert.alert('Не удалось отозвать', 'Проверьте подключение и попробуйте снова.');
      } },
    ]);
  };

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
          <Text style={[ty.largeTitle, { color: '#fff', marginTop: 12 }]} numberOfLines={1}>{meta.title}</Text>
          <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]} numberOfLines={1}>{meta.durationDays} дней · 3 категории · {meta.maxFlags} 🚩 — вылет</Text>
        </View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 90 }}>

        {/* Countdown */}
        <View style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: T.cardBg, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <View style={{ alignItems: 'center', minWidth: 86 }}>
            <Text style={[ty.largeTitle, { color: T.brand }]} numberOfLines={1}>{left}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{tr('дней до старта')}</Text>
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
        <ListSection header={teams.length === 0 ? tr('Команды') : full ? tr('Команды · набор завершён') : `Команды · нужно ещё ${teamsNeed(teams)} человек`}>
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
                  <Text style={[ty.caption2, { color: full ? T.emeraldText : T.orange }]} numberOfLines={1}>{full ? 'набрана' : `нужно ${need}`}</Text>
                </View>
                {i < teams.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 70, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
              </View>
            );
          })}
        </ListSection>

        {/* Rules */}
        {/* Rules — open/hide */}
        <Pressable onPress={() => setRulesOpen((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>
          <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{tr('Правила')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[ty.subheadEm, { color: T.brand }]}>{rulesOpen ? tr('Скрыть') : tr('Открыть')}</Text>
            <SF name={rulesOpen ? 'chevron.down' : 'chevron.right'} size={13} color={T.brand} />
          </View>
        </Pressable>
        {rulesOpen ? (
          <View style={{ marginHorizontal: 16, backgroundColor: T.cardBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 0.5, borderColor: T.cardBorder }}>
            {CHALLENGE_RULES.map((rule, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: i < CHALLENGE_RULES.length - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
                <Text style={[ty.subheadEm, { color: T.brand, width: 18 }]}>{i + 1}</Text>
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{rule}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* CTA */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator, gap: 10 }}>
        {canCreate ? (
          <Pressable onPress={() => navigation.navigate('ManageChallenge', { challengeId: meta.id })}
            style={{ height: 48, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="slider.horizontal.3" size={16} color="#fff" />
            <Text style={[ty.headline, { color: '#fff' }]}>Управление челленджем</Text>
          </Pressable>
        ) : null}
        {canReview ? (
          <Pressable onPress={() => navigation.navigate('ChallengeApplicants', { challengeId: meta.id })}
            style={{ height: 48, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="person.2.fill" size={16} color={T.brand} />
            <Text style={[ty.headline, { color: T.brand }]}>{canCreate ? 'Заявки (все команды)' : 'Заявки моей команды'}</Text>
          </Pressable>
        ) : null}

        {/* Applicant CTA — one application; can re-apply only after a rejection. */}
        {myApp?.status === 'approved' ? (
          <>
            <View style={{ height: 50, borderRadius: 14, backgroundColor: 'rgba(52,199,89,0.14)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <SF name="checkmark.circle.fill" size={18} color={T.green} />
              <Text style={[ty.headline, { color: T.green }]}>Вы в команде{myApp.teamName ? ` «${myApp.teamName}»` : ''}</Text>
            </View>
            {!isCaptainHere ? (
              <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center' }]} numberOfLines={2}>Вас приняли — отозвать заявку уже нельзя. Выйти из команды можно только через капитана.</Text>
            ) : null}
          </>
        ) : myApp?.status === 'pending' ? (
          <>
            <View style={{ height: 50, borderRadius: 14, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <SF name="clock.fill" size={16} color={T.labelSecondary} />
              <Text style={[ty.headline, { color: T.labelSecondary }]}>Заявка на рассмотрении</Text>
            </View>
            <Pressable onPress={confirmWithdraw} disabled={withdrawing} accessibilityRole="button" accessibilityLabel="Отозвать заявку"
              style={{ height: 44, borderRadius: 14, backgroundColor: 'rgba(255,59,48,0.10)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: withdrawing ? 0.6 : 1 }}>
              {withdrawing ? <ActivityIndicator color={T.red} /> : (
                <>
                  <SF name="xmark.circle.fill" size={16} color={T.red} />
                  <Text style={[ty.subheadEm, { color: T.red }]}>Отозвать заявку</Text>
                </>
              )}
            </Pressable>
          </>
        ) : full ? (
          <View style={{ borderRadius: 14, backgroundColor: 'rgba(52,199,89,0.14)', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SF name="checkmark.seal.fill" size={18} color={T.green} />
              <Text style={[ty.headline, { color: T.green }]} numberOfLines={1}>Команды сформированы</Text>
            </View>
            <Text style={[ty.caption1, { color: T.green }]} numberOfLines={1}>Набор завершён — ждём старта</Text>
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
  const { challenge, setMetric, toggleBinary, pointsToday, bonusToday, leaderboard, myRank, teamPoints, teamFlags, teamPenalty, syncPending, dayLocked } = useChallenge();
  const { userId, getToken } = useAuth();
  const { canCreate } = useRole();
  const c = challenge;
  const insets = useSafeAreaInsets();
  // Team chat + captain tools.
  const isCaptain = !!c.captainId && c.captainId === userId;
  const canSeeMemberAnketa = isCaptain || canCreate;
  const [chatOverride, setChatOverride] = useState<string | null>(null);
  const chat = chatOverride ?? c.teamChat ?? null;
  const [textEditor, setTextEditor] = useState<{ title: string; message: string; kind: 'chat' | 'message' } | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [textSaving, setTextSaving] = useState(false);
  const textAction = useRef<(text: string) => void | Promise<void>>(() => {});
  const promptText = (title: string, msg: string, value: string, kind: 'chat' | 'message', onOk: (text: string) => void | Promise<void>) => {
    if (Platform.OS === 'ios' && typeof (Alert as any).prompt === 'function') {
      (Alert as any).prompt(title, msg, [
        { text: tr('Отмена'), style: 'cancel' },
        { text: tr('OK'), onPress: (t: string) => onOk(String(t ?? '')) },
      ], 'plain-text', value);
    } else {
      textAction.current = onOk;
      setTextDraft(value);
      setTextEditor({ title, message: msg, kind });
    }
  };
  const editChat = () => promptText(tr('Ссылка на чат команды'), tr('Вставьте ссылку на Telegram-чат (t.me/…)'), chat ?? '', 'chat', async (txt) => {
    const v = txt.trim();
    if (!c.teamId) return;
    const token = await getToken();
    const ok = await setTeamChat(c.id, c.teamId, v || null, token);
    if (ok) { hSuccess(); setChatOverride(v || null); } else Alert.alert(tr('Не удалось сохранить'));
  });
  const broadcast = () => promptText(tr('Написать команде'), tr('Сообщение придёт пушем всем участникам команды.'), '', 'message', async (txt) => {
    const msg = txt.trim();
    if (!msg || !c.teamId) return;
    const token = await getToken();
    const ok = await broadcastTeam(c.id, c.teamId, msg, token);
    if (ok) { hSuccess(); Alert.alert(tr('Отправлено'), tr('Сообщение отправлено команде.')); } else Alert.alert(tr('Не удалось отправить'));
  });
  const saveTextEditor = async () => {
    if (!textEditor || textSaving) return;
    setTextSaving(true);
    try {
      await textAction.current(textDraft);
      setTextEditor(null);
    } finally {
      setTextSaving(false);
    }
  };
  const completedTasks = c.tasks.filter(taskDone).length;
  const allDone = c.tasks.length > 0 && completedTasks === c.tasks.length;
  const [celebrate, setCelebrate] = useState(false);
  const [showConv, setShowConv] = useState(false);
  const [metricEditor, setMetricEditor] = useState<MetricTask | null>(null);
  const [metricDraft, setMetricDraft] = useState('');
  const [ratingMode, setRatingMode] = useState<'overall' | 'today'>('overall');
  const myFlags = c.flags;
  const myEliminated = c.eliminated === true;
  const prevDone = useRef(allDone);
  const cel = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (allDone && !prevDone.current) {
      setCelebrate(true);
      hSuccess();
      timer = setTimeout(() => setCelebrate(false), 2600);
    }
    prevDone.current = allDone;
    return () => { if (timer) clearTimeout(timer); };
  }, [allDone]);
  useEffect(() => { Animated.spring(cel, { toValue: celebrate ? 1 : 0, useNativeDriver: true, speed: 14, bounciness: 8 }).start(); }, [celebrate]);
  const ringPct = c.totalDays > 0 ? c.currentDay / c.totalDays : 0;
  const finished = c.currentDay >= c.totalDays && c.totalDays > 0;
  const remainingDays = Math.max(0, c.totalDays - c.currentDay);

  // Manual entry for metric tasks (steps / pages): tap the value → type it.
  const promptSet = (t: ChallengeTask) => {
    if (t.kind !== 'metric') return;
    if (Platform.OS === 'ios' && typeof (Alert as any).prompt === 'function') {
      (Alert as any).prompt(t.title, `${tr('Введите значение')} (${t.unit})`, [
        { text: tr('Отмена'), style: 'cancel' },
        { text: tr('Сохранить'), onPress: (txt: string) => { const n = parseInt(String(txt ?? '').replace(/[^\d]/g, ''), 10); if (!isNaN(n)) setMetric(t.id, n); } },
      ], 'plain-text', String(t.current), 'number-pad');
      return;
    }
    setMetricDraft(String(t.current));
    setMetricEditor(t);
  };
  const saveMetric = () => {
    if (!metricEditor) return;
    const value = parseInt(metricDraft.replace(/[^\d]/g, ''), 10);
    if (Number.isNaN(value)) return;
    setMetric(metricEditor.id, value);
    setMetricEditor(null);
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

  const openRoster = () => navigation.navigate('ChallengeRoster', { challengeId: c.id });
  const openStandings = () => navigation.navigate('TeamStandings', { challengeId: c.id });
  const todayLeaderboard = [...leaderboard].sort((a, b) => {
    if (b.day !== a.day) return b.day - a.day;
    const bDone = b.todayTasks.filter((task) => task.completed).length;
    const aDone = a.todayTasks.filter((task) => task.completed).length;
    if (bDone !== aDone) return bDone - aDone;
    return a.name.localeCompare(b.name, 'ru');
  });
  const ratingMembers = ratingMode === 'overall' ? leaderboard : todayLeaderboard;
  const teamPointsToday = leaderboard.reduce((sum, member) => sum + member.day, 0);
  const completedTeamGoals = leaderboard.reduce(
    (sum, member) => sum + member.todayTasks.filter((task) => task.completed).length,
    0,
  );
  const totalTeamGoals = leaderboard.reduce((sum, member) => sum + member.todayTasks.length, 0);
  const openMenu = () => {
    if (Platform.OS === 'ios') {
      const actions: { label: string; run: () => void; destructive?: boolean }[] = [
        { label: tr('Состав команды'), run: openRoster },
        { label: tr('Рейтинг команд'), run: openStandings },
        ...(isCaptain ? [
          { label: chat ? tr('Изменить чат команды') : tr('Добавить чат команды'), run: editChat },
          { label: tr('Написать всей команде'), run: broadcast },
          { label: tr('Заявки и анкеты'), run: () => navigation.navigate('ChallengeApplicants', { challengeId: c.id }) },
        ] : []),
        { label: tr('Как засчитать активность'), run: () => setShowConv(true) },
        { label: tr('Покинуть челлендж'), run: attemptLeave, destructive: true },
      ];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [tr('Отмена'), ...actions.map((a) => a.label)],
          cancelButtonIndex: 0,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive) + 1,
        },
        (i) => { if (i > 0) actions[i - 1]?.run(); },
      );
    } else {
      Alert.alert(c.title, undefined, [
        { text: tr('Состав команды'), onPress: openRoster },
        { text: tr('Рейтинг команд'), onPress: openStandings },
        { text: tr('Как засчитать активность'), onPress: () => setShowConv(true) },
        { text: tr('Покинуть челлендж'), style: 'destructive', onPress: attemptLeave },
        { text: tr('Отмена'), style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <Aurora />
      <NavHeader transparent hairline={false} backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} trailing={(
        <Pressable onPress={openMenu} accessibilityRole="button" accessibilityLabel={tr('Меню челленджа')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <SF name="list.bullet" size={21} color={T.brandAccent} />
        </Pressable>
      )} />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 56, left: 0, right: 0, alignItems: 'center', zIndex: 20, opacity: cel, transform: [{ scale: cel.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
        <View style={{ backgroundColor: T.brand, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
          <Text style={{ fontSize: 18 }}>🎉</Text>
          <Text style={[ty.headline, { color: '#fff' }]}>{tr('День закрыт! Серия')} {c.currentDay} 🔥</Text>
        </View>
      </Animated.View>
      <Screen tabPadding={false} topInset={false} bg="transparent" aurora={false}>

      {/* Compact overview: context and season progress, without repeating daily data. */}
      <View accessible accessibilityLabel={`${c.title}. ${tr('День')} ${c.currentDay} ${tr('из')} ${c.totalDays}. +${pointsToday} pts ${tr('сегодня')}. ${c.teamName ? `${tr('Команда')} ${c.teamName}. ` : ''}${finished ? tr('Челлендж завершён') : `${tr('Осталось')} ${remainingDays} ${tr('дн')}`}`}
        style={{ marginHorizontal: 16, marginTop: 6, marginBottom: 12, borderRadius: 18, overflow: 'hidden', shadowColor: T.brand, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }}>
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Capsule bg="rgba(255,255,255,0.20)" color="#fff"><SF name="flame.fill" size={11} color="#fff" />{tr('День')} {c.currentDay} {tr('из')} {c.totalDays}</Capsule>
            <Text style={[ty.subheadEm, { color: '#fff' }]}>+{pointsToday} pts {tr('сегодня')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11 }}>
            <Logo size={23} body="#fff" head="#fff" />
            <Text style={[ty.title2, { color: '#fff', flex: 1, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]} numberOfLines={2}>{c.title}</Text>
          </View>
          {c.teamName ? <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.88)', marginTop: 6 }]} numberOfLines={1}>{tr('Команда')} «{c.teamName}»</Text> : null}
          <View style={{ marginTop: 13 }}>
            <View style={{ height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, ringPct * 100)}%`, height: '100%', borderRadius: 8, backgroundColor: '#fff' }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
              <Text style={[ty.caption1, { color: 'rgba(255,255,255,0.82)' }]}>{tr('Прогресс челленджа')}</Text>
              <Text style={[ty.caption2Em, { color: '#fff' }]}>{finished ? tr('Завершён') : `${tr('Осталось')} ${remainingDays} ${tr('дн')}`}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Elimination is critical and therefore stays before the daily plan. */}
      {myEliminated ? (
        <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(255,59,48,0.10)', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0.5, borderColor: 'rgba(255,59,48,0.25)' }}>
          <Text style={{ fontSize: 24 }}>🏳️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.red }]}>{tr('Вы выбыли из челленджа')}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{tr('Набрано 3 🚩 в одной категории. Очки зафиксированы.')}</Text>
          </View>
        </View>
      ) : null}

      {/* Primary flow: every change is saved automatically; there is no report step. */}
      <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: T.cardBg, borderRadius: 16, borderWidth: 0.5, borderColor: T.cardBorder, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[ty.headline, { color: T.label, flex: 1 }]}>{tr('План на сегодня')}</Text>
            <Capsule bg={allDone ? 'rgba(52,199,89,0.14)' : T.brandTinted} color={allDone ? T.green : T.brand} style={{ alignSelf: 'center' }}>
              <SF name={allDone ? 'checkmark.circle.fill' : 'target'} size={12} color={allDone ? T.green : T.brand} />
              {allDone ? tr('Готово') : `${completedTasks}/${c.tasks.length}`}
            </Capsule>
          </View>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{completedTasks} {tr('из')} {c.tasks.length} {tr('выполнено')}{bonusToday > 0 ? ` · +${bonusToday} ${tr('бонус')}` : ''}</Text>
          <View accessibilityRole="progressbar" accessibilityLabel={tr('Выполнение плана на сегодня')}
            accessibilityValue={{ min: 0, max: c.tasks.length, now: completedTasks, text: `${completedTasks} ${tr('из')} ${c.tasks.length}` }}
            style={{ height: 5, borderRadius: 5, backgroundColor: T.fillTertiary, overflow: 'hidden', marginTop: 9 }}>
            <View style={{ width: `${c.tasks.length > 0 ? (completedTasks / c.tasks.length) * 100 : 0}%`, height: '100%', borderRadius: 6, backgroundColor: allDone ? T.green : T.brand }} />
          </View>
        </View>
        <View style={{ paddingHorizontal: 14 }}>
          {c.tasks.map((t, i) => (
            <ChallengeTaskRow key={t.id} task={t} divider={i < c.tasks.length - 1}
              disabled={dayLocked}
              onToggle={() => toggleBinary(t.id)}
              onAdjust={t.kind === 'metric' && !isActivityTask(t) ? (d) => setMetric(t.id, t.current + d) : undefined}
              onSet={t.kind === 'metric' ? () => promptSet(t) : undefined}
              step={1} />
          ))}
          {c.tasks.some(isActivityTask) ? (
            <Pressable onPress={() => navigation.navigate('WorkoutTrack', { challengeId: c.id })}
              disabled={dayLocked || myEliminated}
              accessibilityRole="button" accessibilityLabel={tr('Записать тренировку')}
              accessibilityState={{ disabled: dayLocked || myEliminated }}
              style={({ pressed }) => ({ minHeight: 48, borderTopWidth: 0.5, borderTopColor: T.separator, flexDirection: 'row', alignItems: 'center', gap: 9, opacity: dayLocked || myEliminated ? 0.45 : pressed ? 0.6 : 1 })}>
              <SF name="figure.run" size={18} color={T.brand} />
              <Text style={[ty.subheadEm, { color: T.brand, flex: 1 }]}>{tr('Записать бег или ходьбу')}</Text>
              <SF name="chevron.right" size={13} color={T.labelTertiary} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => setShowConv(true)} accessibilityRole="button" accessibilityLabel={tr('Как засчитать активность в шагах')}
            style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}>
            <SF name="info.circle" size={16} color={T.brand} />
            <Text style={[ty.subhead, { color: T.brand, flex: 1 }]} numberOfLines={1}>{tr('Как учитываются шаги?')}</Text>
            <SF name="chevron.right" size={13} color={T.labelTertiary} />
          </Pressable>
          {myFlags && totalFlags(myFlags) > 0 ? (
            <View style={{ borderTopWidth: 0.5, borderTopColor: T.separator, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <SF name="flag.fill" size={15} color={T.red} />
                <Text style={[ty.subheadEm, { color: T.label, flex: 1 }]}>{tr('Мои флаги')}</Text>
                <Text style={[ty.caption1, { color: T.red }]}>{totalFlags(myFlags)} 🚩</Text>
              </View>
              <MyFlagRow flags={myFlags} />
            </View>
          ) : null}
          {c.currentDay > 0 && !finished && !myEliminated ? (
            <View accessible accessibilityRole="text" accessibilityLabel={dayLocked ? tr('День закрыт, ожидаем расчёт сервера') : syncPending ? tr('Отметки ожидают синхронизации') : tr('Отметки сохранены, день закроется в 23:01')}
              style={{ minHeight: 38, borderTopWidth: 0.5, borderTopColor: T.separator, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <SF name={dayLocked || syncPending ? 'clock.arrow.circlepath' : 'checkmark.icloud.fill'} size={14} color={dayLocked || syncPending ? T.orange : T.green} />
              <Text style={[ty.caption2, { color: dayLocked || syncPending ? T.orange : T.labelSecondary, flex: 1 }]}>
                {dayLocked ? tr('День закрыт · ждём расчёт сервера') : syncPending ? tr('Ожидает интернет · отправим автоматически') : tr('Сохранено · итог дня в 23:01')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <ChallengeCalendar totalDays={c.totalDays} currentDay={c.currentDay} T={T} />

      {/* Team card follows the supplied leaderboard reference. */}
      <Pressable onPress={openStandings} accessibilityRole="button" accessibilityLabel={tr('Открыть рейтинг команд')}
        style={({ pressed }) => ({ minHeight: 44, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
        <Text style={[ty.caption2Em, { color: T.labelSecondary, flex: 1, flexShrink: 1, textTransform: 'uppercase', letterSpacing: 0.3 }]}>
          {c.teamName ? `${tr('Команда')} «${c.teamName}»` : tr('Моя команда')} · {c.teamRank > 0 ? `${tr('вы')} ${c.teamRank}-${tr('е место')}` : tr('рейтинг команд')}
        </Text>
        <SF name="chevron.forward" size={12} color={T.labelTertiary} />
      </Pressable>
      <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: T.cardBg, borderRadius: 16, borderWidth: 0.5, borderColor: T.cardBorder, overflow: 'hidden' }}>
        <View style={{ minHeight: 92, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View accessible accessibilityLabel={ratingMode === 'overall' ? `${tr('Накоплено командой')}: ${teamPoints} pts` : `${tr('Очки команды сегодня')}: ${teamPointsToday} pts`} style={{ flex: 0.85 }}>
            <Text style={[ty.footnoteEm, { color: T.labelSecondary }]}>{ratingMode === 'overall' ? tr('Очки команды') : tr('Сегодня командой')}</Text>
            <Text style={[ty.title3, { color: T.brand, marginTop: 5 }]}>{formatTeamNumber(ratingMode === 'overall' ? teamPoints : teamPointsToday)} pts</Text>
          </View>
          <View accessible accessibilityLabel={ratingMode === 'overall' ? `${tr('Штрафы команды')}: ${teamFlags} ${tr('флагов')}` : `${tr('Выполнено целей')}: ${completedTeamGoals} ${tr('из')} ${totalTeamGoals}`} style={{ flex: 1.15, alignItems: 'flex-end' }}>
            <Text style={[ty.footnoteEm, { color: T.labelSecondary, textAlign: 'right' }]}>{ratingMode === 'overall' ? tr('Штрафы команды') : tr('Выполнено целей')}</Text>
            {ratingMode === 'today' ? (
              <Text style={[ty.title3, { color: T.green, marginTop: 5 }]}>{completedTeamGoals}/{totalTeamGoals}</Text>
            ) : teamFlags > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 }}>
                <SF name="flag.fill" size={13} color={T.red} />
                <Text style={[ty.footnoteEm, { color: T.red }]}>{teamFlags} {flagWord(teamFlags)}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 }}>
                <SF name="checkmark.circle.fill" size={13} color={T.green} />
                <Text style={[ty.footnoteEm, { color: T.green }]}>{tr('Нет штрафов')}</Text>
              </View>
            )}
          </View>
        </View>
        <RatingModeSwitch value={ratingMode} onChange={setRatingMode} T={T} />
        {ratingMembers.map((member, index) => (
          <TeamMemberPreview key={member.id} member={member} currentDay={c.currentDay} T={T}
            mode={ratingMode}
            displayRank={index + 1}
            canOpen={canSeeMemberAnketa}
            onPress={() => navigation.navigate('ChallengeApplicants', { challengeId: c.id, applicantUserId: member.id })}
            divider />
        ))}
        <QuickLink icon="person.2.fill" title={tr('Состав команды')} detail={String(leaderboard.length)} onPress={openRoster} T={T} />
        {chat ? (
          <>
            <View style={{ marginLeft: 58, height: 0.5, backgroundColor: T.separator }} />
            <QuickLink icon="paperplane.fill" title={tr('Чат команды')} detail="Telegram" onPress={() => Linking.openURL(chat).catch(() => {})} T={T} accent="#229ED9" />
          </>
        ) : null}
      </View>

      {/* Activity step-conversions sheet (from the Divergents rules) */}
      <Modal visible={showConv} transparent animationType="slide" onRequestClose={() => setShowConv(false)}>
        <Pressable onPress={() => setShowConv(false)} accessibilityRole="button" accessibilityLabel={tr('Закрыть справку')}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} accessible={false}
            style={{ backgroundColor: T.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 20 }}>
            <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillTertiary, marginBottom: 14 }} />
            <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{tr('Пересчёт активности в шаги')}</Text>
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

      <Modal visible={metricEditor !== null} transparent animationType="fade" onRequestClose={() => setMetricEditor(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable onPress={() => setMetricEditor(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
            <Pressable onPress={() => {}} accessible={false} style={{ backgroundColor: T.cardBg, borderRadius: 18, padding: 18 }}>
              <Text style={[ty.title3, { color: T.label }]}>{metricEditor?.title}</Text>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{tr('Введите значение')} ({metricEditor?.unit})</Text>
              <TextInput value={metricDraft} onChangeText={setMetricDraft} autoFocus keyboardType="number-pad"
                selectTextOnFocus accessibilityLabel={tr('Значение активности')}
                style={[ty.title2, { color: T.label, backgroundColor: T.fillTertiary, borderRadius: 12, minHeight: 52, paddingHorizontal: 14, marginTop: 14 }]} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <Pressable onPress={() => setMetricEditor(null)} style={{ minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.headline, { color: T.labelSecondary }]}>{tr('Отмена')}</Text>
                </Pressable>
                <Pressable onPress={saveMetric} disabled={!/\d/.test(metricDraft)}
                  style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', opacity: /\d/.test(metricDraft) ? 1 : 0.45 }}>
                  <Text style={[ty.headline, { color: T.onBrand }]}>{tr('Сохранить')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={textEditor !== null} transparent animationType="fade" onRequestClose={() => setTextEditor(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable onPress={() => setTextEditor(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
            <Pressable onPress={() => {}} accessible={false} style={{ backgroundColor: T.cardBg, borderRadius: 18, padding: 18 }}>
              <Text style={[ty.title3, { color: T.label }]}>{textEditor?.title}</Text>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{textEditor?.message}</Text>
              <TextInput
                value={textDraft}
                onChangeText={setTextDraft}
                autoFocus
                multiline={textEditor?.kind === 'message'}
                keyboardType={textEditor?.kind === 'chat' ? 'url' : 'default'}
                autoCapitalize={textEditor?.kind === 'chat' ? 'none' : 'sentences'}
                accessibilityLabel={textEditor?.title}
                style={[ty.body, { color: T.label, backgroundColor: T.fillTertiary, borderRadius: 12, minHeight: textEditor?.kind === 'message' ? 96 : 52, padding: 14, marginTop: 14, textAlignVertical: 'top' }]}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={tr('Отмена')} onPress={() => setTextEditor(null)} style={{ minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.headline, { color: T.labelSecondary }]}>{tr('Отмена')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={tr('Сохранить')} accessibilityState={{ disabled: textSaving, busy: textSaving }} onPress={saveTextEditor} disabled={textSaving}
                  style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', opacity: textSaving ? 0.55 : 1 }}>
                  {textSaving ? <ActivityIndicator color={T.onBrand} /> : <Text style={[ty.headline, { color: T.onBrand }]}>{tr('Сохранить')}</Text>}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <View style={{ height: 30 }} />
      </Screen>
    </View>
  );
}

const teamNumberFormatter = new Intl.NumberFormat('ru-RU');
const paceNumberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
// Group thousands with a NON-BREAKING space so "10 000" can never wrap into
// "0/10" + "000 шаги" inside a narrow badge.
const formatTeamNumber = (value: number) => teamNumberFormatter.format(value).replace(/\s/g, ' ');
const formatPace = (value: number) => paceNumberFormatter.format(value);
const formatSignedPenalty = (value: number) => value < 0 ? `−${formatTeamNumber(Math.abs(value))}` : formatTeamNumber(value);
const placeWord = (value: number) => {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return tr('место');
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return tr('места');
  return tr('мест');
};
const flagWord = (value: number) => {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return tr('флаг');
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return tr('флага');
  return tr('флагов');
};

function memberFlagDetail(flags: FlagCounts | undefined): string {
  if (!flags) return '';
  const details = [
    flags.A > 0 ? `A-${flags.A}` : '',
    flags.NS > 0 ? `NS-${flags.NS}` : '',
    flags.R > 0 ? `R-${flags.R}` : '',
  ].filter(Boolean);
  return details.join(' · ');
}

function RatingModeSwitch({ value, onChange, T }: {
  value: 'overall' | 'today';
  onChange: (value: 'overall' | 'today') => void;
  T: any;
}) {
  return (
    <View style={{ marginHorizontal: 12, marginBottom: 10, minHeight: 44, padding: 3, borderRadius: 12, backgroundColor: T.fillTertiary, flexDirection: 'row' }}>
      {([
        { key: 'overall' as const, label: tr('Общий рейтинг') },
        { key: 'today' as const, label: tr('Сегодня') },
      ]).map((option) => {
        const selected = value === option.key;
        return (
          <Pressable key={option.key} onPress={() => onChange(option.key)} accessibilityRole="tab"
            accessibilityState={{ selected }} accessibilityLabel={option.label}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 38,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? T.cardBg : 'transparent',
              borderWidth: selected ? 0.5 : 0,
              borderColor: T.cardBorder,
              opacity: pressed ? 0.68 : 1,
              shadowColor: selected ? '#000' : 'transparent',
              shadowOpacity: selected ? 0.08 : 0,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
            })}>
            <Text style={[ty.footnoteEm, { color: selected ? T.label : T.labelSecondary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TeamMemberPreview({ member, currentDay, T, canOpen, onPress, divider, mode, displayRank }: {
  member: RankedMember;
  currentDay: number;
  T: any;
  canOpen: boolean;
  onPress: () => void;
  divider: boolean;
  mode: 'overall' | 'today';
  displayRank: number;
}) {
  const flagCount = totalFlags(member.flags);
  const flagDetail = memberFlagDetail(member.flags);
  const rankMark = displayRank === 1 ? '🥇' : displayRank === 2 ? '🥈' : displayRank === 3 ? '🥉' : null;
  const eliminated = member.eliminated === true;
  const rankChange = member.rankChange ?? 0;
  const rankMovement = member.rankChange == null
    ? tr('Первый день')
    : rankChange > 0
      ? `↑ ${rankChange} ${placeWord(rankChange)}`
      : rankChange < 0
        ? `↓ ${Math.abs(rankChange)} ${placeWord(Math.abs(rankChange))}`
        : tr('Без изменений');
  const content = (
    <View style={{ minHeight: mode === 'today' ? 94 : flagCount > 0 ? 108 : 86, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: member.isMe ? T.brandTinted : 'transparent', opacity: eliminated ? 0.62 : 1, borderBottomWidth: divider ? 0.5 : 0, borderBottomColor: T.separator }}>
      <View style={{ width: 22, minHeight: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[ty.footnoteEm, { color: displayRank <= 3 ? T.brand : T.labelSecondary }]}>{displayRank}</Text>
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: eliminated ? T.fillSecondary : T.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[ty.subheadEm, { color: eliminated ? T.labelSecondary : '#fff' }]}>{eliminated ? '🏳️' : member.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ minHeight: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={[ty.footnoteEm, { color: eliminated ? T.labelSecondary : T.label, flex: 1, flexShrink: 1 }]}>
            {member.name}{member.isMe ? ` (${tr('вы')})` : ''}{eliminated ? <Text style={{ color: T.red }}> · {tr('выбыл')}</Text> : null}
          </Text>
          {mode === 'today' ? <Text style={[ty.footnoteEm, { color: T.brand }]}>{formatTeamNumber(member.day)} pts</Text> : null}
        </View>
        {mode === 'overall' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6, rowGap: 1, marginTop: 3 }}>
              <Text style={[ty.footnoteEm, { color: T.brand }]}>{formatTeamNumber(member.points)} pts</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>{formatPace(member.averagePoints ?? member.points / Math.max(1, currentDay))} pts/{tr('день')} · {tr('средний темп')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <View accessible accessibilityLabel={rankMovement} style={{ minHeight: 24, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: rankChange > 0 ? 'rgba(52,199,89,0.13)' : rankChange < 0 ? 'rgba(255,149,0,0.13)' : T.fillTertiary }}>
                <Text style={[ty.caption2Em, { color: rankChange > 0 ? T.green : rankChange < 0 ? T.orange : T.labelSecondary }]}>{rankMovement}</Text>
              </View>
              {rankMark ? <Text style={{ fontSize: 14 }}>{rankMark}</Text> : null}
              {flagCount > 0 ? (
                <View style={{ minHeight: 24, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,59,48,0.10)' }}>
                  <SF name="flag.fill" size={11} color={T.red} />
                  <Text style={[ty.caption2Em, { color: T.red }]}>{flagCount} {flagWord(flagCount)}</Text>
                </View>
              ) : null}
              {flagDetail ? <Text style={[ty.caption2Em, { color: T.red, flexShrink: 1 }]}>{flagDetail}</Text> : null}
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {member.todayTasks.map((task) => <TodayGoalBadge key={task.id} task={task} T={T} />)}
            {member.todayTasks.length === 0 ? <Text style={[ty.caption2, { color: T.labelSecondary }]}>{tr('Данные целей обновятся при подключении')}</Text> : null}
          </View>
        )}
      </View>
      {eliminated ? <Text style={{ fontSize: 16 }}>🏳️</Text> : member.isMe && mode === 'overall' ? <Text style={{ fontSize: 16 }}>🔥</Text> : null}
    </View>
  );

  if (!canOpen) return <View accessible accessibilityLabel={`${displayRank} ${tr('место')}, ${member.name}, ${mode === 'today' ? member.day : member.points} pts${flagCount ? `, ${flagCount} ${tr('флагов')}` : ''}`}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${tr('Открыть анкету')} — ${member.name}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
      {content}
    </Pressable>
  );
}

function TodayGoalBadge({ task, T }: { task: MemberTaskProgress; T: any }) {
  const complete = task.completed;
  // The short title already says what the metric is ("Активность", "Чтение"),
  // so the unit is dropped for steps — it only made the badge wrap.
  const isSteps = /шаг/i.test(`${task.title} ${task.unit ?? ''}`);
  const value = task.kind === 'metric'
    ? `${formatTeamNumber(task.value)}/${formatTeamNumber(task.target ?? 0)}${task.unit && !isSteps ? ` ${task.unit}` : ''}`
    : complete
      ? tr('выполнено')
      : task.marked
        ? tr('не выполнено')
        : tr('не отмечено');
  const shortTitle = /сахар/i.test(task.title)
    ? tr('Без сахара')
    : /чтен|книг|стр/i.test(task.title)
      ? tr('Чтение')
      : /актив|шаг/i.test(`${task.title} ${task.unit}`)
        ? tr('Активность')
        : task.title;
  return (
    <View accessible accessibilityLabel={`${shortTitle}: ${value}, ${complete ? tr('выполнено') : tr('не выполнено')}`}
      style={{ minHeight: 26, maxWidth: '100%', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: complete ? 'rgba(52,199,89,0.13)' : 'rgba(255,59,48,0.10)' }}>
      <SF name={complete ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={12} color={complete ? T.green : T.red} />
      <Text numberOfLines={2} style={[ty.caption2Em, { color: complete ? T.green : T.red, flexShrink: 1 }]}>{shortTitle} · {value}</Text>
    </View>
  );
}

function QuickLink({ icon, title, detail, onPress, T, accent }: { icon: any; title: string; detail?: string; onPress: () => void; T: any; accent?: string }) {
  const color = accent ?? T.brand;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={detail ? `${title}, ${detail}` : title}
      style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? T.fillTertiary : 'transparent' })}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: accent ? 'rgba(34,158,217,0.12)' : T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
        <SF name={icon} size={14} color={color} />
      </View>
      <Text style={[ty.footnoteEm, { color: T.label, flex: 1, flexShrink: 1 }]}>{title}</Text>
      {detail ? <Text style={[ty.footnote, { color: T.labelSecondary, flexShrink: 1, textAlign: 'right' }]}>{detail}</Text> : null}
      <SF name="chevron.forward" size={13} color={T.labelTertiary} />
    </Pressable>
  );
}

function ChallengeCalendar({ totalDays, currentDay, T }: { totalDays: number; currentDay: number; T: any }) {
  const almatyNow = new Date(Date.now() + 5 * 3_600_000);
  const todayUtc = Date.UTC(almatyNow.getUTCFullYear(), almatyNow.getUTCMonth(), almatyNow.getUTCDate());
  const safeTotal = Math.max(0, totalDays);
  const safeCurrent = Math.min(Math.max(currentDay, 1), Math.max(safeTotal, 1));
  const todayLabel = new Date(todayUtc).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: T.cardBg, borderRadius: 16, borderWidth: 0.5, borderColor: T.cardBorder, overflow: 'hidden' }}>
      <View style={{ minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
          <SF name="calendar" size={14} color={T.brand} />
        </View>
        <Text style={[ty.subheadEm, { color: T.label, flex: 1 }]}>{tr('Календарь челленджа')}</Text>
        <Capsule bg={T.brandTinted} color={T.brand} style={{ alignSelf: 'center' }}>{safeCurrent}/{safeTotal}</Capsule>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 7, flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: safeTotal }, (_, i) => {
          const challengeDay = i + 1;
          const isToday = challengeDay === safeCurrent;
          const isPast = challengeDay < safeCurrent;
          const date = new Date(todayUtc + (challengeDay - safeCurrent) * 86_400_000);
          const dateLabel = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
          return (
            <View key={challengeDay} accessible accessibilityRole="text"
              accessibilityLabel={`${tr('День')} ${challengeDay}, ${dateLabel}${isToday ? `, ${tr('сегодня')}` : isPast ? `, ${tr('прошёл')}` : ''}`}
              style={{ width: `${100 / 7}%`, padding: 2 }}>
              <View style={{ minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? T.brand : isPast ? T.brandTinted : T.fillTertiary, borderWidth: isToday ? 0 : 0.5, borderColor: isPast ? T.brand : T.cardBorder }}>
                <Text style={[ty.footnoteEm, { color: isToday ? '#fff' : isPast ? T.brand : T.label }]}>{date.getUTCDate()}</Text>
                <Text style={[ty.caption2, { color: isToday ? 'rgba(255,255,255,0.82)' : T.labelSecondary, marginTop: 1 }]}>{tr('Д')}{challengeDay}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ minHeight: 32, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <Text style={[ty.caption2, { color: T.labelSecondary }]} numberOfLines={1}>{tr('Сегодня')}: {todayLabel} · {safeCurrent}/{safeTotal} {tr('день')}</Text>
      </View>
    </View>
  );
}

// Matches the local activity task id or a server-provided steps unit.
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
            {/* Number only — the section header already says these are flags. */}
            <Text style={[ty.title3, { color: danger ? T.red : T.label, marginTop: 4 }]} numberOfLines={1}>{n}</Text>
            <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{cat.title}</Text>
          </View>
        );
      })}
    </View>
  );
}
