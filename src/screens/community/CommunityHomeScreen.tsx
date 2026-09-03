import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, LayoutAnimation, ActivityIndicator, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { PageIntro } from '../../components/PageIntro';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { ResumeCallout } from '../../components/ResumeCallout';
import { useResumeAccess } from '../../state/useResumeAccess';
import { SF } from '../../components/SFIcon';
import { SectionHeader, ListSection, Capsule, Chip, PrimaryButton } from '../../components/ui';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { Logo } from '../../components/Logo';
import { useChallenge } from '../../state/ChallengeContext';
import { useEnrollment } from '../../state/EnrollmentContext';
import { joinSport, leaveSport, joinFailureMessage } from '../../data/api';
import { useAuth } from '@clerk/clerk-expo';
import { useNotifications } from '../../state/NotificationsContext';
import {
  daysUntil, fetchCommunityHome, teamsNeed,
  Trip, SportActivity, ChallengeListItem,
} from '../../data/community';
import { imgUrl } from '../../data/api';
import { Channel } from '../../data/channel';
import { useChannel } from '../../state/ChannelContext';
import { CommunityStackParams } from '../../navigation/types';
import { useLang, tr } from '../../state/LanguageContext';
import { useRole } from '../../state/useRole';
import { hTap } from '../../lib/haptics';
import * as pl from '../../data/plural';
import { ProfileAvatarButton } from '../../components/ProfileAvatarButton';

type Props = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>;
type Nav = Props['navigation'];

// Creator-only entry → the unified content-creation screen, which has its own
// challenge / trip / channel type selector.
function openCreateSheet(navigation: Nav) {
  hTap();
  navigation.navigate('CreateContent');
}

const SECTION_KEYS = ['sec_home', 'sec_channels', 'sec_challenges', 'sec_trips', 'sec_sport'] as const;
// Разделы «Сообщества» можно выключать в админ-панели сайта. Лента и челленджи
// флага не имеют: без них вкладка теряет смысл.
const SECTION_FEATURE: Record<number, string> = { 1: 'channels', 3: 'trips', 4: 'sport' };

export function CommunityHomeScreen({ navigation, route }: Props) {
  const { T, ty } = useTheme();
  const { t } = useLang();
  const { unread } = useNotifications();
  const { reload: reloadChannels } = useChannel();
  const { canCreate, feature } = useRole();
  const [seg, setSeg] = useState(0);
  const sectionOn = (i: number) => {
    const key = SECTION_FEATURE[i];
    return !key || feature(key);
  };
  // Раздел выключили, пока пользователь в нём стоял — возвращаем на ленту,
  // иначе экран остался бы пустым без единой кнопки.
  React.useEffect(() => { if (!sectionOn(seg)) setSeg(0); }, [seg, feature]);
  const refreshToken = route.params?.refresh;
  const focusParam = route.params?.focus;

  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [sport, setSport] = useState<SportActivity[] | null>(null);
  const [challenges, setChallenges] = useState<ChallengeListItem[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const d = await fetchCommunityHome();
    setTrips(d.trips);
    setSport(d.sport);
    setChallenges(d.challenges);
    setError(d.error);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await fetchCommunityHome();
      if (!alive) return;
      setTrips(d.trips);
      setSport(d.sport);
      setChallenges(d.challenges);
      setError(d.error);
    })();
    return () => { alive = false; };
  }, []);

  const onRefresh = useCallback(async () => {
    reloadChannels();
    await load();
  }, [load, reloadChannels]);

  // A create modal sets route.params.refresh on dismissal — reload the lists
  // once so newly published content shows immediately.
  useEffect(() => {
    if (refreshToken === undefined) return;
    reloadChannels();
    load();
  }, [refreshToken, load, reloadChannels]);

  // Switch to the section that actually shows the content we were sent to (the
  // home tab lists channels/trips/sport but NOT open challenges, so a new
  // challenge would otherwise look missing). Kept SEPARATE from the refresh
  // effect: notification deep links arrive with `focus` and no `refresh`, and
  // used to land on the feed with nothing switched.
  useEffect(() => {
    if (!focusParam) return;
    const idx = focusParam === 'channel' ? 1 : focusParam === 'challenge' ? 2 : focusParam === 'trip' ? 3 : 4;
    if (!sectionOn(idx)) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSeg(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusParam, refreshToken, feature]);

  return (
    <Screen largeTitle={tr('Сообщество')} onRefresh={onRefresh}>
      <PageIntro page="community" />
      <NavBarLarge title={t('community')} trailing={(
        <>
          {canCreate ? <HeaderIcon name="plus" color={T.brand} label="Создать" onPress={() => openCreateSheet(navigation)} /> : null}
          <ProfileAvatarButton onPress={() => navigation.getParent()?.navigate('ProfileTab' as never)} />
        </>
      )} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        <Logo size={22} />
        <Text style={[ty.subhead, { color: T.labelSecondary, flex: 1 }]} numberOfLines={1}>{t('community_tagline')}</Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <ResumeCallout area="community" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {SECTION_KEYS.map((k, i) => (sectionOn(i)
          ? <Chip key={k} label={t(k)} active={seg === i} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(i); }} />
          : null))}
      </ScrollView>

      {seg === 0 && <HomeFeed navigation={navigation} setSeg={setSeg} trips={trips} sport={sport} challenges={challenges} error={error} onRetry={load} />}
      {seg === 1 && sectionOn(1) && <ChannelTab navigation={navigation} />}
      {seg === 2 && <ChallengesTab navigation={navigation} challenges={challenges} error={error} onRetry={load} />}
      {seg === 3 && sectionOn(3) && <TripsTab navigation={navigation} trips={trips} error={error} onRetry={load} />}
      {seg === 4 && sectionOn(4) && <SportTab sport={sport} error={error} onRetry={load} />}
      <View style={{ height: 16 }} />
    </Screen>
  );
}

// Small inline loading spinner row.
function Loading() {
  const { T, ty } = useTheme();
  return <View style={{ paddingVertical: 28, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>;
}

// Renders an ERROR + RETRY state when the load failed, otherwise the empty state.
function EmptyOrError({ error, onRetry, icon, title, subtitle }: { error: boolean; onRetry?: () => void; icon: string; title: string; subtitle: string }) {
  if (error) return <ErrorState onRetry={onRetry} />;
  return <EmptyState icon={icon} title={title} subtitle={subtitle} />;
}

// ─── Active challenge card (only when there's a live one) ───────────
function ActiveChallengeCard({ navigation }: { navigation: Nav }) {
  const { T, ty } = useTheme();
  const { challenge: c, teamPoints, pointsToday } = useChallenge();
  const open = () => navigation.navigate('ChallengeDetail', { challengeId: c.id });
  const stats = [
    // «Серия» показывала номер текущего дня: пропустив пять дней, человек всё
    // равно видел «Серия 12 дн». Настоящей серии в приложении нет — подписываем
    // честно, номером дня челленджа.
    { v: `${c.currentDay}/${c.totalDays}`, l: tr('День') },
    { v: `${teamPoints}`, l: tr('Очки команды') },
    // Раньше здесь было «место в СВОЕЙ команде / число КОМАНД» — 12 / 6.
    // Показываем место команды рядом с её же очками.
    { v: c.teamRank > 0 ? `${c.teamRank} / ${c.teamCount}` : '—', l: tr('Место команды') },
  ];
  return (
    <Pressable onPress={open} style={{ marginHorizontal: 16, marginBottom: 18, borderRadius: 18, overflow: 'hidden', backgroundColor: T.cardBg, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="flame.fill" size={11} color="#fff" />{tr('Активный челлендж')}</Capsule>
          <Capsule bg="rgba(255,255,255,0.22)" color="#fff">{tr('День')} {c.currentDay}/{c.totalDays}</Capsule>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Logo size={22} body="#fff" head="#fff" />
          <Text style={[ty.title2, { color: '#fff', flex: 1 }]} numberOfLines={1}>{c.title}</Text>
        </View>
        <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]} numberOfLines={1}>{c.teamName ? `${tr('Команда')} «${c.teamName}» · ` : ''}{c.eliminated ? tr('очки зафиксированы') : `${tr('сегодня')} +${pointsToday} pts`}</Text>
        <View style={{ marginTop: 12, height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
          <View style={{ width: `${(c.totalDays > 0 ? c.currentDay / c.totalDays : 0) * 100}%`, height: '100%', backgroundColor: '#fff', borderRadius: 6 }} />
        </View>
      </LinearGradient>
      <View style={{ flexDirection: 'row', paddingVertical: 14 }}>
        {stats.map((st, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
            <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{st.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{st.l}</Text>
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
        <PrimaryButton label={tr('Войти в челлендж')} icon="arrow.right" onPress={open} style={{ height: 46 }} />
      </View>
    </Pressable>
  );
}

// White text over a brand gradient can wash out where the gradient goes light
// (esp. dark-mode brandAccent). This shadow keeps every white label legible.
const HERO_TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } as const;

function PersonalActivityCard({ icon, eyebrow, title, subtitle, onPress }: {
  icon: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { T, ty } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${eyebrow}: ${title}`}
      style={({ pressed }) => ({
        minHeight: 68, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16,
        backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: T.brandTinted }}>
        <SF name={icon} size={19} color={T.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ty.caption2Em, { color: T.brand, textTransform: 'uppercase', letterSpacing: 0.25 }]} numberOfLines={1}>{eyebrow}</Text>
        <Text style={[ty.subheadEm, { color: T.label, marginTop: 1 }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <SF name="chevron.forward" size={13} color={T.labelTertiary} />
    </Pressable>
  );
}

// ─── Open-challenge card (full-width) ───────────────────────────────
// Shared by the home feed and the Челленджи tab so an open challenge always
// renders as one full-width card — never a narrow, left-floating carousel item.
function ChallengeCard({ ch, onPress }: { ch: ChallengeListItem; onPress: () => void }) {
  const { T, ty } = useTheme();
  const left = daysUntil(ch.startISO);
  // All team spots taken → recruitment done, waiting for the start.
  const full = ch.teamList.length > 0 && teamsNeed(ch.teamList) === 0;
  const countdown = left > 0
    ? `${tr('Старт через')} ${pl.days(left)}${ch.startLabel ? ` · ${ch.startLabel}` : ''}`
    : tr('Старт скоро');
  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({ marginHorizontal: 16, marginBottom: 14, backgroundColor: T.cardBg, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: T.cardBorder, opacity: pressed ? 0.9 : 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 })}>
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
        {/* Darkening overlay → guarantees white text contrast across the gradient */}
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.04)']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <SF name={ch.icon} size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: '#fff' }, HERO_TEXT_SHADOW]} numberOfLines={2}>{ch.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <SF name="calendar" size={11} color="#fff" />
              <Text style={[ty.caption1, { color: '#fff', flex: 1 }, HERO_TEXT_SHADOW]} numberOfLines={1}>{countdown}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      <View style={{ padding: 14 }}>
        {ch.subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary, marginBottom: 10 }]} numberOfLines={2}>{ch.subtitle}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Capsule bg="rgba(52,199,89,0.14)" color={T.green}><SF name="globe" size={11} color={T.green} />{tr('Онлайн')}</Capsule>
          <Capsule bg={T.brandTinted} color={T.brand}><SF name="flame.fill" size={11} color={T.brand} />{pl.days(ch.durationDays)}</Capsule>
          <Capsule bg={T.fillTertiary} color={T.label}><SF name="person.3.fill" size={11} color={T.labelSecondary} />{pl.applications(ch.participants)}</Capsule>
          <Capsule bg="rgba(255,59,48,0.12)" color={T.red}>{ch.maxFlags} 🚩 {tr('вылет')}</Capsule>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            {full ? <SF name="checkmark.seal.fill" size={12} color={T.green} /> : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: T.green }} />}
            <Text style={[ty.caption1, { color: full ? T.green : T.labelSecondary, flexShrink: 1 }]} numberOfLines={1}>{full ? tr('Команды сформированы · ждём старта') : tr('Набор открыт')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[ty.subheadEm, { color: T.brand }]} numberOfLines={1}>{tr('Подробнее')}</Text>
            <SF name="chevron.forward" size={12} color={T.brand} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Главная ────────────────────────────────────────────────────────
function HomeFeed({ navigation, setSeg, trips, sport, challenges, error, onRetry }: { navigation: Nav; setSeg: (i: number) => void; trips: Trip[] | null; sport: SportActivity[] | null; challenges: ChallengeListItem[] | null; error: boolean; onRetry: () => void }) {
  const { t } = useLang();
  const { T, ty } = useTheme();
  const { channels, error: channelsError, reload: reloadChannels } = useChannel();
  const { isParticipant } = useChallenge();
  const { has, ready, statusOf } = useEnrollment();
  const openChallenges = (challenges ?? []).filter((x) => x.status === 'upcoming');
  // Отклонённых заявок здесь уже нет (сервер их не отдаёт), но заявка на
  // рассмотрении — это ещё НЕ «Ваша поездка»: подписываем её честно.
  const myTrips = ready ? (trips ?? []).filter((trip) => has(`trip:${trip.id}`)) : [];
  const mySport = ready ? (sport ?? []).filter((activity) => has(`sport:${activity.id}`)) : [];
  const hasPersonalActivity = isParticipant || myTrips.length > 0 || mySport.length > 0;
  return (
    <>
      {/* Personal activity is visible only to the signed-up participant. */}
      {hasPersonalActivity ? <SectionHeader title={tr('Мои активности')} /> : null}
      {isParticipant ? <ActiveChallengeCard navigation={navigation} /> : null}
      {myTrips.map((trip) => (
        <PersonalActivityCard key={`mine-trip:${trip.id}`} icon="map.fill"
          eyebrow={statusOf(`trip:${trip.id}`) === 'pending' ? tr('Заявка на рассмотрении') : tr('Ваша поездка')}
          title={trip.title} subtitle={[trip.date, trip.region].filter(Boolean).join(' · ')}
          onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })} />
      ))}
      {mySport.map((activity) => (
        <PersonalActivityCard key={`mine-sport:${activity.id}`} icon={activity.icon} eyebrow={tr('Вы записаны')}
          title={activity.title} subtitle={[activity.date, activity.place].filter(Boolean).join(' · ')}
          onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(4); }} />
      ))}
      {/* Channels first */}
      <SectionHeader title={t('sec_channels')} action={t('all')} onAction={() => navigation.navigate('Channels')} />
      {channels.length === 0
        ? <EmptyOrError error={channelsError} onRetry={reloadChannels} icon="tray" title={tr('Пока ничего нет')} subtitle={tr('Каналы сообщества появятся здесь.')} />
        : channels.map((ch) => <ChannelRow key={ch.id} channel={ch} navigation={navigation} />)}

      {/* Challenges — open registration */}
      <View style={{ marginTop: 18 }}>
        <SectionHeader title={t('sec_challenges')} action={t('all')} onAction={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(2); }} />
        {challenges === null ? <Loading /> : openChallenges.length === 0 ? (
          <EmptyOrError error={error} onRetry={onRetry} icon="flag.fill" title={tr('Пока ничего нет')} subtitle={tr('Новые челленджи появятся здесь.')} />
        ) : (
          openChallenges.map((ch) => (
            <ChallengeCard key={ch.id} ch={ch} onPress={() => navigation.navigate('ChallengeDetail', { challengeId: ch.id })} />
          ))
        )}
      </View>

      <View style={{ marginTop: 18 }}>
        <SectionHeader title={t('upcoming_trips')} action={t('all')} onAction={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(3); }} />
        {trips === null ? <Loading /> : trips.length === 0 ? (
          <EmptyOrError error={error} onRetry={onRetry} icon="map" title={tr('Пока ничего нет')} subtitle={tr('Поездки сообщества появятся здесь.')} />
        ) : (
          trips.map((tp) => <TripCardH key={tp.id} trip={tp} navigation={navigation} />)
        )}
      </View>

      <View style={{ marginTop: 18 }}>
        <SectionHeader title={t('sec_sport')} action={t('all')} onAction={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(4); }} />
        {sport === null ? <Loading /> : sport.length === 0 ? (
          <EmptyOrError error={error} onRetry={onRetry} icon="figure.walk" title={tr('Пока ничего нет')} subtitle={tr('Спортивные активности появятся здесь.')} />
        ) : (
          sport.map((sp) => (
            <Pressable key={sp.id} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(4); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginBottom: 14, backgroundColor: T.cardBg, borderRadius: 18, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder, opacity: pressed ? 0.9 : 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 })}>
              <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                <SF name={sp.icon} size={24} color={T.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{sp.title}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{sp.place}{sp.date ? ` · ${sp.date}` : ''}</Text>
              </View>
              <SF name="chevron.forward" size={14} color={T.labelTertiary} />
            </Pressable>
          ))
        )}
      </View>
    </>
  );
}

// ─── Челленджи ──────────────────────────────────────────────────────
function ChallengesTab({ navigation, challenges, error, onRetry }: { navigation: Nav; challenges: ChallengeListItem[] | null; error: boolean; onRetry: () => void }) {
  const { isParticipant } = useChallenge();
  // Only a REAL server-active challenge (currentDay > 0) counts. The offline
  // DEFAULT_CHALLENGE placeholder always has tasks, so the old `|| tasks.length`
  // made a phantom "active challenge" (День 0/21) show permanently.
  const hasActive = isParticipant;
  const upcoming = (challenges ?? []).filter((x) => x.status === 'upcoming');
  return (
    <>
      <SectionHeader title={tr('Активный челлендж')} />
      {hasActive
        ? <ActiveChallengeCard navigation={navigation} />
        : <EmptyState icon="flame.fill" title={tr('Сейчас нет активного челленджа')} subtitle={tr('Следите за анонсами — новый старт скоро.')} />}
      <SectionHeader title={tr('Открыт набор')} />
      {challenges === null ? <Loading /> : upcoming.length === 0 ? (
        <EmptyOrError error={error} onRetry={onRetry} icon="calendar" title={tr('Пока ничего нет')} subtitle={tr('Новые челленджи появятся здесь.')} />
      ) : upcoming.map((ch) => (
        <ChallengeCard key={ch.id} ch={ch} onPress={() => navigation.navigate('ChallengeDetail', { challengeId: ch.id })} />
      ))}
    </>
  );
}

// ─── Поездки ────────────────────────────────────────────────────────
// Full-width trip card — same footprint as the challenge card. Uses the photo
// when there is one, otherwise a brand gradient header (trips have no image yet).
function TripCardH({ trip, navigation }: { trip: Trip; navigation: Nav }) {
  const { T, ty } = useTheme();
  return (
    <Pressable onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
      style={({ pressed }) => ({ marginHorizontal: 16, marginBottom: 14, backgroundColor: T.cardBg, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: T.cardBorder, opacity: pressed ? 0.9 : 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 })}>
      {trip.imageUrl ? (
        <View style={{ height: 150 }}>
          <Image source={imgUrl(trip.imageUrl, 800)} style={{ width: '100%', height: 150 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          {trip.date ? <View style={{ position: 'absolute', top: 12, left: 12 }}><Capsule bg="rgba(0,0,0,0.45)" color="#fff"><SF name="calendar" size={11} color="#fff" />{trip.date}</Capsule></View> : null}
        </View>
      ) : (
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.04)']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <SF name="map.fill" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: '#fff' }, HERO_TEXT_SHADOW]} numberOfLines={2}>{trip.title}</Text>
            {trip.date ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <SF name="calendar" size={11} color="#fff" />
                <Text style={[ty.caption1, { color: '#fff' }, HERO_TEXT_SHADOW]} numberOfLines={1}>{trip.date}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      )}
      <View style={{ padding: 14 }}>
        {trip.imageUrl ? <Text style={[ty.headline, { color: T.label, marginBottom: 8 }]} numberOfLines={1}>{trip.title}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Capsule bg="rgba(255,149,0,0.14)" color={T.orange}><SF name="figure.walk" size={11} color={T.orange} />{tr('Офлайн')}</Capsule>
          {trip.region ? <Capsule bg={T.fillTertiary} color={T.label}><SF name="mappin.and.ellipse" size={11} color={T.labelSecondary} />{trip.region}</Capsule> : null}
          {trip.difficulty ? <Capsule bg={T.fillTertiary} color={T.label}>{trip.difficulty}</Capsule> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <Text style={[ty.caption1, { color: T.labelSecondary, flexShrink: 1 }]} numberOfLines={1}>{trip.meta}</Text>
          <Text style={[ty.subheadEm, { color: T.brand }]} numberOfLines={1}>{trip.price}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function TripsTab({ navigation, trips, error, onRetry }: { navigation: Nav; trips: Trip[] | null; error: boolean; onRetry: () => void }) {
  const { T, ty } = useTheme();
  if (trips === null) return <Loading />;
  if (trips.length === 0) return <EmptyOrError error={error} onRetry={onRetry} icon="map" title={tr('Пока ничего нет')} subtitle={tr('Поездки сообщества появятся здесь.')} />;
  return (
    <ListSection header={tr('Все поездки')}>
      {trips.map((t, i) => (
        <Pressable key={t.id} onPress={() => navigation.navigate('TripDetail', { tripId: t.id })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <Image source={imgUrl(t.imageUrl, 256)} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{t.title}</Text>
            {/* `meta` — это уже «регион · дата», поэтому строка «{date} · {meta} · {price}»
                читалась как «12 авг · Алматы · 12 авг · Бесплатно». Собираем один раз
                и только из непустых кусков. */}
            {[t.region, t.difficulty].filter(Boolean).length > 0 ? (
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{[t.region, t.difficulty].filter(Boolean).join(' · ')}</Text>
            ) : null}
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{[t.date, t.price].filter(Boolean).join(' · ')}</Text>
          </View>
          <SF name="chevron.forward" size={14} color={T.labelTertiary} />
          {i < trips.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 88, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
        </Pressable>
      ))}
    </ListSection>
  );
}

// ─── Спорт ──────────────────────────────────────────────────────────
function SportTab({ sport, error, onRetry }: { sport: SportActivity[] | null; error: boolean; onRetry: () => void }) {
  const { T, ty } = useTheme();
  const { has, add, remove } = useEnrollment();
  const { require: requireResume } = useResumeAccess();
  const { getToken } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  if (sport === null) return <Loading />;
  if (sport.length === 0) return <EmptyOrError error={error} onRetry={onRetry} icon="figure.walk" title={tr('Пока ничего нет')} subtitle={tr('Спортивные активности появятся здесь.')} />;
  return (
    <ListSection header={tr('Спортивные активности')}>
      {sport.map((sp, i) => {
        const k = `sport:${sp.id}`;
        const on = has(k);
        // sp.going — серверный счётчик, в котором пользователь УЖЕ учтён;
        // прибавлять себя ещё раз значило считать себя дважды.
        const going = sp.going;
        return (
          <View key={sp.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: sp.tint, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={sp.icon} size={22} color={T.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{sp.title}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{[sp.place, sp.date].filter(Boolean).join(' · ')}</Text>
              {/* spotsLabel теперь остаток, а не вместимость: «12 идут · 10 мест»
                  раньше выглядело так, будто мест больше, чем участников. */}
              <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{going} идут · {sp.spotsLabel}</Text>
              {sp.note ? <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 2 }]} numberOfLines={2}>{sp.note}</Text> : null}
            </View>
            <Pressable disabled={busy === sp.id} onPress={async () => {
              if (busy) return;
              const joining = !on;
              // Записаться можно только с заполненной анкетой; отменить запись —
              // всегда: держать человека в активности насильно было бы странно.
              if (joining && !requireResume('community')) return;
              setBusy(sp.id);
              // Оптимистично — но с откатом, если сервер отказал.
              if (joining) add(k); else remove(k);
              try {
                const tk = await getToken();
                const res = joining ? await joinSport(tk, sp.id) : await leaveSport(tk, sp.id);
                // Отмена записи, которой на сервере нет, — уже нужный результат.
                if (!res.ok && !(!joining && res.status === 404)) {
                  if (joining) remove(k); else add(k);
                  const m = joinFailureMessage(res);
                  Alert.alert(tr(joining ? m.title : 'Не удалось отменить запись'), tr(m.body));
                } else {
                  onRetry(); // перечитать счётчики «идут / осталось мест»
                }
              } catch {
                if (joining) remove(k); else add(k);
                Alert.alert(tr('Нет связи'), tr('Проверьте подключение и попробуйте снова.'));
              } finally {
                setBusy(null);
              }
            }} style={{ backgroundColor: on ? T.brand : T.brandTinted, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, opacity: busy === sp.id ? 0.6 : 1 }}>
              <Text style={[ty.subheadEm, { color: on ? '#fff' : T.brand }]} numberOfLines={1}>{on ? 'Вы идёте' : 'Участвую'}</Text>
            </Pressable>
            {i < sport.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 72, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
          </View>
        );
      })}
    </ListSection>
  );
}

// ─── Каналы (Telegram-style список) ─────────────────────────────────
function ChannelTab({ navigation }: { navigation: Nav }) {
  const { T, ty } = useTheme();
  const { t } = useLang();
  const { channels, loading, error, reload } = useChannel();
  return (
    <View>
      <Text style={[ty.footnote, { color: T.labelSecondary, marginHorizontal: 20, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{t('channels_of_community')}</Text>
      {loading && channels.length === 0 ? <Loading />
        : channels.length === 0 ? <EmptyOrError error={error} onRetry={reload} icon="tray" title={tr('Пока ничего нет')} subtitle={tr('Каналы сообщества появятся здесь.')} />
        : channels.map((ch) => <ChannelRow key={ch.id} channel={ch} navigation={navigation} />)}
    </View>
  );
}

function ChannelRow({ channel, navigation }: { channel: Channel; navigation: Nav }) {
  const { T, ty } = useTheme();
  const { isJoined, unread, postsByChannel } = useChannel();
  const joined = isJoined(channel.id);
  const count = unread(channel.id);
  const posts = postsByChannel(channel.id);
  const last = posts[0];
  const closed = channel.access === 'request';
  const initial = (channel.name?.trim()?.[0] ?? 'K').toUpperCase();
  // Second line: latest post for subscribers, otherwise the channel bio.
  const secondary = joined && last ? last.title : (channel.bio?.trim() || '');
  return (
    <Pressable onPress={() => navigation.navigate('ServerChannel', { channelId: channel.id })}
      accessibilityRole="button" accessibilityLabel={`${tr('Канал')} ${channel.name}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.cardBg, borderRadius: 18, padding: 14, marginHorizontal: 16, marginBottom: 14, borderWidth: 0.5, borderColor: T.cardBorder, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2, opacity: pressed ? 0.9 : 1 })}>
      <View>
        {channel.avatar ? (
          <Image source={{ uri: channel.avatar }} style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: T.brandTinted }} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[ty.title3, { color: '#fff' }]}>{initial}</Text>
          </LinearGradient>
        )}
        {closed ? (
          <View style={{ position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: T.cardBg, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: T.labelTertiary, alignItems: 'center', justifyContent: 'center' }}>
              <SF name="lock.fill" size={9} color="#fff" />
            </View>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[ty.headline, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{channel.name}</Text>
          {channel.verified ? <SF name="checkmark.seal.fill" size={14} color={T.sky} /> : null}
        </View>
        {secondary ? (
          <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{secondary}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
          <SF name="doc.text.fill" size={10} color={T.labelTertiary} />
          <Text style={[ty.caption2, { color: T.labelTertiary }]} numberOfLines={1}>
            {posts.length}{closed ? ` · ${tr('Закрытый')}` : ` · ${tr('Открытый')}`}
          </Text>
        </View>
      </View>
      {joined && count > 0 ? (
        <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[ty.caption2Em, { color: '#fff' }]}>{count}</Text>
        </View>
      ) : joined ? (
        <SF name="checkmark.circle.fill" size={20} color={T.brand} />
      ) : (
        <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: T.brandTinted }}>
          <Text style={[ty.caption2Em, { color: T.brand }]}>{closed ? tr('Запрос') : tr('Открыть')}</Text>
        </View>
      )}
    </Pressable>
  );
}
