// Строка канала в списке «Каналы»: аватар, название целиком (до двух строк), последняя
// публикация или описание и счётчики. Подписка: время последней публикации и число новых;
// не подписан — доступ и стрелка. Нажатие по всей строке открывает канал.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Channel, PostType } from '../data/channel';
import { fmtInt } from '../data/format';
import { count, word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, nums } from '../theme/tokens';
import { ChannelAvatar } from './ChannelAvatar';
import { SF } from './SFIcon';

export type ChannelLatest = { title: string; type: PostType; timeLabel: string };

export function channelMeta(channel: Pick<Channel, 'memberCount' | 'postCount'>) {
  return [channel.memberCount != null ? `${fmtInt(channel.memberCount)} ${word(channel.memberCount, 'участник', 'участника', 'участников')}` : null,
    `${fmtInt(channel.postCount)} ${word(channel.postCount, 'публикация', 'публикации', 'публикаций')}`].filter(Boolean).join(' · ');
}

export function CommunityChannelRow({ channel, joined, unread = 0, latest, onPress }: {
  channel: Channel; joined: boolean; unread?: number; latest?: ChannelLatest; onPress: () => void;
}) {
  const { T, ty } = useTheme();
  const closed = channel.access === 'request';
  const preview = joined && latest ? latest : null;
  const subtitle = preview ? preview.title : channel.bio.trim();
  const meta = channelMeta(channel);
  const label = [channel.name, closed ? 'закрытый канал' : null, joined ? 'вы участник' : null, unread ? `${count(unread, 'новая публикация', 'новые публикации', 'новых публикаций')}` : null,
    preview ? `последняя: ${preview.title}, ${preview.timeLabel}` : subtitle, meta].filter(Boolean).join('. ');
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => [styles.row, { backgroundColor: pressed ? T.fillTertiary : 'transparent' }]}>
    <ChannelAvatar name={channel.name} uri={channel.avatar} locked={closed} />
    <View style={styles.body}>
      <View style={styles.top}>
        <View style={styles.title}>
          <Text style={[ty.headline, { color: T.label, flexShrink: 1 }]} numberOfLines={2}>{channel.name}</Text>
          {channel.verified ? <SF name="checkmark.seal.fill" size={15} color={T.brandText} /> : null}
        </View>
        {preview ? <Text style={[ty.footnote, nums, { color: unread ? T.brandText : T.labelTertiary }]}>{preview.timeLabel}</Text> : null}
      </View>
      {subtitle || unread > 0 ? <View style={styles.line}>
        {preview?.type === 'audio' ? <SF name="waveform" size={13} color={T.labelSecondary} /> : null}
        <Text style={[ty.subhead, { color: T.labelSecondary, flex: 1 }]} numberOfLines={2}>{subtitle}</Text>
        {unread > 0 ? <View style={[styles.badge, { backgroundColor: T.brand }]}>
          <Text style={[ty.footnoteEm, nums, { color: T.onBrand }]}>{unread > 99 ? '99+' : unread}</Text>
        </View> : null}
      </View> : null}
      {!joined ? <Text style={[ty.footnote, nums, { color: T.labelTertiary }]} numberOfLines={2}>{meta}</Text> : null}
    </View>
    {!joined ? <SF name="chevron.forward" size={14} color={T.labelTertiary} /> : null}
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16, minHeight: minTouch },
  body: { flex: 1, minWidth: 0, gap: 3 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
});
