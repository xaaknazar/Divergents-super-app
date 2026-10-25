// Шапка канала: обложка из его картинки, аватар, название, описание, три счётчика и одно
// главное действие. Гость — вступить или запросить доступ; участник — спокойная отметка;
// автор — «Новая публикация», заявки и настройки.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fmtInt } from '../data/format';
import { word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { Button } from './Button';
import { ChannelAvatar } from './ChannelAvatar';
import { SF } from './SFIcon';
import { Wrapper } from './Wrapper';

export type ChannelRole = 'owner' | 'member' | 'guest';

export function ChannelHero({ name, handle, bio, avatarUri, access, memberCount, postCount, role, requested = false, busy = false,
  pendingRequests = 0, onJoin, onCompose, onRequests, onSettings }: {
  name: string; handle?: string | null; bio?: string | null; avatarUri?: string | null; access: 'open' | 'request';
  memberCount?: number; postCount: number; role: ChannelRole; requested?: boolean; busy?: boolean; pendingRequests?: number;
  onJoin?: () => void; onCompose?: () => void; onRequests?: () => void; onSettings?: () => void;
}) {
  const { T, ty, isDark } = useTheme();
  const [bioOpen, setBioOpen] = useState(false);
  const closed = access === 'request';
  const longBio = (bio?.length ?? 0) > 140;
  return <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: isDark ? T.cardBorder : 'transparent' }]}>
    <View style={styles.cover}>
      {avatarUri ? <Image source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} cachePolicy="memory-disk" />
        : <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']} style={StyleSheet.absoluteFill} />
    </View>
    <View style={styles.body}>
      <View style={styles.avatar}><ChannelAvatar name={name} uri={avatarUri} size="large" ring /></View>
      <Text accessibilityRole="header" style={[ty.title2, styles.center, { color: T.label }]}>{name}</Text>
      {handle ? <Text style={[ty.subhead, styles.center, { color: T.labelSecondary }]}>@{handle}</Text> : null}
      {bio ? <Pressable disabled={!longBio} onPress={() => setBioOpen(v => !v)} accessibilityRole={longBio ? 'button' : undefined}
        accessibilityHint={longBio ? (bioOpen ? 'Свернуть описание' : 'Показать описание целиком') : undefined}>
        <Text style={[ty.callout, styles.center, styles.bio, { color: T.labelSecondary }]} numberOfLines={longBio && !bioOpen ? 3 : undefined}>{bio}</Text>
        {longBio ? <Text style={[ty.subheadEm, styles.center, { color: T.brandText }]}>{bioOpen ? 'Свернуть' : 'Ещё'}</Text> : null}
      </Pressable> : null}
      <View style={[styles.stats, { borderColor: T.separator }]}>
        {memberCount != null ? <Stat value={fmtInt(memberCount)} label={word(memberCount, 'участник', 'участника', 'участников')} /> : null}
        <Stat value={fmtInt(postCount)} label={word(postCount, 'публикация', 'публикации', 'публикаций')} />
        <Stat icon={closed ? 'lock.fill' : 'globe'} label={closed ? 'закрытый' : 'открытый'} />
      </View>
      {role === 'owner' ? <Wrapper gap={10}>
        <Button label="Новая публикация" icon="square.and.pencil" size="large" onPress={onCompose} />
        <Wrapper dir="row" gap={10}>
          {closed ? <Wrapper flex={1}><Button label={pendingRequests ? `Заявки · ${pendingRequests}` : 'Заявки'} icon="person.badge.plus" variant="tinted" size="compact" onPress={onRequests} /></Wrapper> : null}
          <Wrapper flex={1}><Button label="Настройки" icon="gearshape.fill" variant="tinted" size="compact" onPress={onSettings} /></Wrapper>
        </Wrapper>
      </Wrapper>
      : role === 'member' ? <View accessible accessibilityLabel="Вы участник канала" style={[styles.member, { backgroundColor: T.brandTinted }]}>
        <SF name="checkmark.circle.fill" size={16} color={T.brandText} />
        <Text style={[ty.subheadEm, { color: T.brandText }]}>Вы участник канала</Text>
      </View>
      : requested ? <Wrapper gap={8}>
        <Button label="Запрос отправлен" icon="clock.fill" variant="tinted" size="large" disabled />
        <Text style={[ty.footnote, styles.center, { color: T.labelSecondary }]}>Автор рассмотрит заявку — публикации откроются здесь.</Text>
      </Wrapper>
      : <Wrapper gap={8}>
        <Button label={closed ? 'Запросить доступ' : 'Вступить в канал'} icon={closed ? 'lock.open.fill' : 'plus'} size="large" loading={busy} onPress={onJoin} />
        <Text style={[ty.footnote, styles.center, { color: T.labelSecondary }]}>{closed ? 'Публикации видят участники. Вступление — по одобрению автора.' : 'Новые публикации канала будут отмечены в «Сообществе».'}</Text>
      </Wrapper>}
    </View>
  </View>;
}

function Stat({ value, label, icon }: { value?: string; label: string; icon?: string }) {
  const { T, ty } = useTheme();
  return <View accessible accessibilityLabel={[value, label].filter(Boolean).join(' ')} style={styles.stat}>
    {icon ? <SF name={icon} size={18} color={T.label} /> : <Text style={[ty.headline, nums, { color: T.label }]} numberOfLines={1}>{value}</Text>}
    <Text style={[ty.footnote, { color: T.labelSecondary }]} numberOfLines={1}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.block + 4, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 0.5 },
  cover: { height: 104, overflow: 'hidden' },
  body: { paddingHorizontal: 18, paddingBottom: 18, gap: 6 },
  avatar: { alignSelf: 'center', marginTop: -48, marginBottom: 6 },
  center: { textAlign: 'center' },
  bio: { marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 12, marginBottom: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1, alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center' },
  member: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: radius.xl, borderCurve: 'continuous' },
});
