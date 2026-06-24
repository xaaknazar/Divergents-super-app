import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, LayoutAnimation, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF, SFName } from '../../components/SFIcon';
import { ProgressBar, SectionHeader, ListSection, Capsule, Chip, PrimaryButton, IconSquircle, ty } from '../../components/ui';
import { Logo } from '../../components/Logo';
import { useChallenge } from '../../state/ChallengeContext';
import { useEnrollment } from '../../state/EnrollmentContext';
import { useNotifications } from '../../state/NotificationsContext';
import {
  CHALLENGES, daysUntil, TRIPS, SPORT, LECTURES,
  Trip, SportActivity, Lecture,
} from '../../data/community';
import { imgUrl } from '../../data/api';
import { CHANNELS, channelById, postsByChannel } from '../../data/channel';
import { useChannel } from '../../state/ChannelContext';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>;
type Nav = Props['navigation'];

const SECTIONS = ['Главная', 'Челленджи', 'Поездки', 'Спорт', 'Канал'];

export function CommunityHomeScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { unread } = useNotifications();
  const [seg, setSeg] = useState(0);

  return (
    <Screen largeTitle="Сообщество">
      <NavBarLarge title="Сообщество" trailing={<HeaderIcon name="bell.fill" color={T.brand} badge={unread} onPress={() => navigation.getParent()?.getParent()?.navigate('Notifications' as never)} />} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        <Logo size={22} />
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>Divergents · свои люди и общий рост</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {SECTIONS.map((s, i) => <Chip key={s} label={s} active={seg === i} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(i); }} />)}
      </ScrollView>

      {seg === 0 && <HomeFeed navigation={navigation} setSeg={setSeg} />}
      {seg === 1 && <ChallengesTab navigation={navigation} />}
      {seg === 2 && <TripsTab navigation={navigation} />}
      {seg === 3 && <SportTab />}
      {seg === 4 && <ChannelTab navigation={navigation} />}
      <View style={{ height: 16 }} />
    </Screen>
  );
}

// ─── Active challenge card (redesigned, enterable) ──────────────────
function ActiveChallengeCard({ navigation }: { navigation: Nav }) {
  const { T } = useTheme();
  const { challenge: c, teamPoints, myRank, pointsToday } = useChallenge();
  const open = () => navigation.navigate('ChallengeDetail', { challengeId: c.id });
  const stats = [
    { v: `${c.currentDay} дн`, l: 'Серия' },
    { v: `${teamPoints}`, l: 'Очки команды' },
    { v: `${myRank} / ${c.teamCount}`, l: 'Место' },
  ];
  return (
    <Pressable onPress={open} style={{ marginHorizontal: 16, marginBottom: 18, borderRadius: 18, overflow: 'hidden', backgroundColor: T.cardBg, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="flame.fill" size={11} color="#fff" />Активный челлендж</Capsule>
          <Capsule bg="rgba(255,255,255,0.22)" color="#fff">День {c.currentDay}/{c.totalDays}</Capsule>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Logo size={22} body="#fff" head="#fff" />
          <Text style={[ty.title2, { color: '#fff' }]}>{c.title}</Text>
        </View>
        <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>Команда «{c.teamName}» · сегодня +{pointsToday} pts</Text>
        <View style={{ marginTop: 12, height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
          <View style={{ width: `${(c.currentDay / c.totalDays) * 100}%`, height: '100%', backgroundColor: '#fff', borderRadius: 6 }} />
        </View>
      </LinearGradient>
      <View style={{ flexDirection: 'row', paddingVertical: 14 }}>
        {stats.map((st, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
            <Text style={[ty.title3, { color: T.label }]}>{st.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{st.l}</Text>
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
        <PrimaryButton label="Войти в челлендж" icon="arrow.right" onPress={open} style={{ height: 46 }} />
      </View>
    </Pressable>
  );
}

// ─── Главная ────────────────────────────────────────────────────────
function HomeFeed({ navigation, setSeg }: { navigation: Nav; setSeg: (i: number) => void }) {
  const { T } = useTheme();
  return (
    <>
      <SectionHeader title="Твой челлендж" />
      <ActiveChallengeCard navigation={navigation} />

      <SectionHeader title="Предстоящие поездки" action="Все" onAction={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(2); }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 8 }}>
        {TRIPS.map((t) => <TripCardH key={t.id} trip={t} navigation={navigation} />)}
      </ScrollView>

      <View style={{ marginTop: 18 }}>
        <SectionHeader title="Спорт" action="Все" onAction={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(3); }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 8 }}>
          {SPORT.map((sp) => (
            <Pressable key={sp.id} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(3); }} style={{ width: 180, backgroundColor: T.cardBg, borderRadius: 14, padding: 14 }}>
              <IconSquircle icon={sp.icon} bg={T.brand} size={34} />
              <Text style={[ty.headline, { color: T.label, marginTop: 10 }]} numberOfLines={1}>{sp.title}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{sp.place}</Text>
              <Text style={[ty.caption2, { color: T.brand, marginTop: 6 }]}>{sp.date}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ marginTop: 18 }}>
        <SectionHeader title="Каналы" action="Все" onAction={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(4); }} />
        {CHANNELS.map((ch) => <ChannelRow key={ch.id} channel={ch} navigation={navigation} />)}
      </View>

    </>
  );
}

// ─── Челленджи ──────────────────────────────────────────────────────
function ChallengesTab({ navigation }: { navigation: Nav }) {
  const { T } = useTheme();
  return (
    <>
      <SectionHeader title="Активный челлендж" />
      <ActiveChallengeCard navigation={navigation} />
      <SectionHeader title="Открыт набор" />
      {CHALLENGES.filter((x) => x.status === 'upcoming').map((ch) => (
        <Pressable key={ch.id} onPress={() => navigation.navigate('ChallengeDetail', { challengeId: ch.id })}
          style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: T.cardBg, borderRadius: 16, overflow: 'hidden' }}>
          <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 96, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <SF name={ch.icon} size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Capsule bg="rgba(255,255,255,0.22)" color="#fff"><SF name="calendar" size={11} color="#fff" />Старт {ch.startLabel}</Capsule>
              <Text style={[ty.title3, { color: '#fff', marginTop: 6 }]}>{ch.title}</Text>
            </View>
          </LinearGradient>
          <View style={{ padding: 14 }}>
            <Text style={[ty.subhead, { color: T.labelSecondary }]}>{ch.subtitle}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Capsule bg={T.brandTinted} color={T.brand}>через {daysUntil(ch.startISO)} дн.</Capsule>
              <Capsule bg={T.fillTertiary} color={T.label}>{ch.durationDays} дней</Capsule>
              <Capsule bg={T.fillTertiary} color={T.label}><SF name="person.3.fill" size={11} color={T.labelSecondary} />{ch.participants} заявок</Capsule>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <Text style={[ty.caption1, { color: T.red }]}>3 пропуска (🚩) — вылет</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[ty.subheadEm, { color: T.brand }]}>Подробнее</Text>
                <SF name="chevron.forward" size={12} color={T.brand} />
              </View>
            </View>
          </View>
        </Pressable>
      ))}
    </>
  );
}

// ─── Поездки ────────────────────────────────────────────────────────
function TripCardH({ trip, navigation }: { trip: Trip; navigation: Nav }) {
  const { T } = useTheme();
  return (
    <Pressable onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
      style={{ width: 260, backgroundColor: T.cardBg, borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ height: 140 }}>
        <Image source={imgUrl(trip.imageUrl, 640)} style={{ width: '100%', height: 140 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <Capsule bg="rgba(0,0,0,0.45)" color="#fff"><SF name="calendar" size={11} color="#fff" />{trip.date}</Capsule>
        </View>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{trip.title}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{trip.region}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={[ty.caption1, { color: T.labelSecondary }]}>{trip.meta}</Text>
          <Text style={[ty.subheadEm, { color: T.brand }]}>{trip.price}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function TripsTab({ navigation }: { navigation: Nav }) {
  const { T } = useTheme();
  return (
    <ListSection header="Все поездки">
      {TRIPS.map((t, i) => (
        <Pressable key={t.id} onPress={() => navigation.navigate('TripDetail', { tripId: t.id })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <Image source={imgUrl(t.imageUrl, 256)} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]}>{t.title}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{t.region} · {t.difficulty}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{t.date} · {t.meta} · {t.price}</Text>
          </View>
          <SF name="chevron.forward" size={14} color={T.labelTertiary} />
          {i < TRIPS.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 88, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
        </Pressable>
      ))}
    </ListSection>
  );
}

// ─── Спорт ──────────────────────────────────────────────────────────
function SportTab() {
  const { T } = useTheme();
  const { has, toggle } = useEnrollment();
  return (
    <ListSection header="Спортивные активности">
      {SPORT.map((sp, i) => (
        <View key={sp.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: sp.tint, alignItems: 'center', justifyContent: 'center' }}>
            <SF name={sp.icon} size={22} color={T.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]}>{sp.title}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{sp.place} · {sp.date}</Text>
            <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 2 }]}>{sp.going} идут · {sp.spotsLabel}</Text>
          </View>
          {(() => { const k = `sport:${sp.id}`; const on = has(k); return (
            <Pressable onPress={() => toggle(k)} style={{ backgroundColor: on ? T.brand : T.brandTinted, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 }}>
              <Text style={[ty.subheadEm, { color: on ? '#fff' : T.brand }]}>{on ? 'Вы идёте' : 'Участвую'}</Text>
            </Pressable>
          ); })()}
          {i < SPORT.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 72, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
        </View>
      ))}
    </ListSection>
  );
}

// ─── Каналы (Telegram-style список) ─────────────────────────────────
function ChannelTab({ navigation }: { navigation: Nav }) {
  const { T } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 4, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }]}>Каналы сообщества</Text>
      {CHANNELS.map((ch) => <ChannelRow key={ch.id} channel={ch} navigation={navigation} />)}
    </View>
  );
}

function ChannelRow({ channel, navigation }: { channel: typeof CHANNELS[number]; navigation: Nav }) {
  const { T } = useTheme();
  const { isJoined, isPaid, unread } = useChannel();
  const joined = isJoined(channel.id) || isPaid(channel.id);
  const count = unread(channel.id);
  const last = postsByChannel(channel.id)[0];
  return (
    <Pressable onPress={() => navigation.navigate('Channel', { channelId: channel.id })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: T.cardBorder }}>
      <Image source={{ uri: channel.avatar }} style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: T.brandTinted }} contentFit="cover" cachePolicy="memory-disk" />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{channel.name}</Text>
          {channel.verified ? <SF name="checkmark.seal.fill" size={14} color="#0EA5E9" /> : null}
          {channel.access === 'request' ? <SF name="lock.fill" size={11} color={T.labelTertiary} /> : null}
          {channel.access === 'paid' ? <SF name="creditcard.fill" size={11} color={T.labelTertiary} /> : null}
        </View>
        <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>
          {joined && last ? last.title : channel.access === 'request' ? 'Закрытый канал · по запросу' : channel.access === 'paid' ? `Платный · ${channel.price ? channel.price.toLocaleString('ru-RU') + ' ₸' : ''}` : `@${channel.handle}`}
        </Text>
      </View>
      {joined && count > 0 ? (
        <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[ty.caption2Em, { color: '#fff' }]}>{count}</Text>
        </View>
      ) : joined ? (
        <SF name="checkmark.circle.fill" size={20} color={T.brand} />
      ) : (
        <SF name="chevron.forward" size={14} color={T.labelTertiary} />
      )}
    </Pressable>
  );
}
