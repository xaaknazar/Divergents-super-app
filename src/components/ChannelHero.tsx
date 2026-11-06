import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ServerChannel } from '../data/api';
import { word } from '../data/plural';
import { useChannelAppearance } from './useChannelAppearance';
import { useTheme } from '../theme/ThemeContext';
import { ChannelArtwork } from './ChannelArtwork';
import { Button } from './Button';
import { SF } from './SFIcon';
import { Wrapper } from './Wrapper';

export interface ChannelHeroProps {
  channel: ServerChannel;
  owner?: boolean;
  membership?: string | null;
  busy?: boolean;
  requestCount?: number;
  onJoin: () => void;
  onCreatePost: () => void;
  onRequests: () => void;
  onManage: () => void;
}
export function ChannelHero({ channel, owner = false, membership, busy = false,
  requestCount = 0, onJoin, onCreatePost, onRequests, onManage }: ChannelHeroProps) {
  const { T } = useTheme();
  const C = useChannelAppearance();
  const ty = {
    title1: { fontSize: 25 * C.textScale, fontWeight: '700' as const },
    subhead: { fontSize: 15 * C.textScale }, footnote: { fontSize: 13 * C.textScale },
    body: { fontSize: 17 * C.textScale, lineHeight: 24 * C.textScale },
    headline: { fontSize: 17 * C.textScale, fontWeight: '600' as const },
  };
  const [expanded, setExpanded] = useState(false);
  const joined = membership === 'subscribed' || membership === 'approved';
  const pending = membership === 'requested';
  const closed = channel.access !== 'open';
  const members = channel._count?.members;
  const long = (channel.bio?.length ?? 0) > 140;
  return <View style={styles.hero}>
    <ChannelArtwork uri={channel.avatarUrl} name={channel.name} size="hero" />
    <View style={styles.identity}>
      <Text accessibilityRole="header" style={[ty.title1, styles.center, { color: T.label }]}>{channel.name}</Text>
      {channel.handle ? <Text style={[ty.subhead, styles.center, { color: T.labelSecondary }]}>@{channel.handle}</Text> : null}
      <View style={styles.meta}>
        <SF name={closed ? 'lock.fill' : 'globe'} size={13} color={T.labelSecondary} />
        <Text style={[ty.footnote, styles.center, { color: T.labelSecondary }]}>
          {closed ? 'По запросу' : 'Открытый канал'}{members == null ? '' : ` · ${members} ${word(members, 'участник', 'участника', 'участников')}`}
        </Text>
      </View>
    </View>
    {channel.bio ? <View style={styles.bio}>
      <Text style={[ty.body, styles.center, { color: T.labelSecondary }]} numberOfLines={long && !expanded ? 3 : undefined}>{channel.bio}</Text>
      {long ? <Button label={expanded ? 'Свернуть описание' : 'О канале'} variant="plain" size="compact"
        expanded={expanded} onPress={() => setExpanded(v => !v)} /> : null}
    </View> : null}
    <View style={styles.actions}>
      {owner ? <>
        <Button label="Создать пост" icon="square.and.pencil" onPress={onCreatePost} />
        <Wrapper dir="row" gap={8} wrap justify="center">
          {closed ? <Button label={requestCount ? `Заявки · ${requestCount}` : 'Заявки'} icon="person.2" variant="plain" size="compact" onPress={onRequests} /> : null}
          <Button label="Управление" icon="slider.horizontal.3" variant="plain" size="compact" onPress={onManage} />
        </Wrapper>
      </> : joined ? <View accessibilityRole="text" style={[styles.joined, { backgroundColor: T.brandTinted }]}>
        <SF name="checkmark.circle.fill" size={18} color={T.brandText} />
        <Text style={[ty.headline, { color: T.brandText }]}>Вы подписаны</Text>
      </View> : <Button label={pending ? 'Запрос отправлен' : closed ? 'Запросить доступ' : 'Подписаться'}
        icon={pending ? 'clock' : 'plus'} variant={pending ? 'tinted' : 'solid'}
        loading={busy} disabled={pending} onPress={onJoin} />}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 20 },
  identity: { alignItems: 'center', gap: 6, width: '100%' },
  center: { textAlign: 'center', flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bio: { width: '100%', maxWidth: 500 },
  actions: { width: '100%', maxWidth: 360, gap: 8 },
  joined: { minHeight: 52, padding: 14, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
});
