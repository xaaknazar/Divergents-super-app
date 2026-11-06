import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Channel } from '../data/channel';
import { word } from '../data/plural';
import { ChannelArtwork } from './ChannelArtwork';
import { SF } from './SFIcon';
import { useChannelAppearance } from './useChannelAppearance';

export interface ChannelCardProps {
  channel: Channel;
  postCount: number;
  membership?: string | null;
  unreadCount?: number;
  latestTitle?: string;
  latestDate?: string;
  onOpen: () => void;
}

/** A single chat-style row. The unread counter is never a separate target. */
export function ChannelCard({ channel, postCount, membership, unreadCount = 0, latestTitle, latestDate, onOpen }: ChannelCardProps) {
  const C = useChannelAppearance();
  const joined = membership === 'subscribed' || membership === 'approved';
  const pending = membership === 'requested';
  const status = pending ? 'Запрос отправлен' : joined ? 'Вы подписаны' : channel.access === 'open' ? 'Открытый канал' : 'По запросу';
  // Private-channel text must not leak into the discovery preview.
  const preview = pending ? status : (channel.access === 'open' || joined) && latestTitle
    ? latestTitle : channel.bio?.trim() || `${postCount} ${word(postCount, 'публикация', 'публикации', 'публикаций')}`;
  const date = latestDate ? new Date(latestDate) : null;
  const time = date && !isNaN(date.getTime()) ? date.toLocaleDateString('ru-RU', { day: 'numeric', month: '2-digit' }) : '';
  return <Pressable onPress={onOpen} accessibilityRole="button"
    accessibilityLabel={`Канал ${channel.name}. ${status}${joined && unreadCount ? `. Новых публикаций: ${unreadCount}` : ''}`}
    accessibilityHint="Открыть канал"
    style={({ pressed }) => [styles.row, { backgroundColor: C.surface, opacity: pressed ? 0.65 : 1 }]}>
    <ChannelArtwork uri={channel.avatar} name={channel.name} size="compact" />
    <View style={[styles.content, { borderBottomColor: C.separator }]}>
      <View style={styles.heading}>
        <Text style={[styles.name, { color: C.label, fontSize: 17 * C.textScale }]}>{channel.name}</Text>
        {channel.verified ? <SF name="checkmark.seal.fill" size={16} color={C.accent} /> : null}
        {time ? <Text style={[styles.date, { color: C.secondary, fontSize: 12 * C.textScale }]}>{time}</Text> : null}
      </View>
      <View style={styles.preview}>
        <Text numberOfLines={2} style={[styles.previewText, { color: C.secondary, fontSize: 16 * C.textScale }]}>{preview}</Text>
        {joined && unreadCount > 0 ? <View style={[styles.badge, { backgroundColor: C.accent }]}>
          <Text style={[styles.badgeText, { color: C.isDark ? '#132744' : '#FFFFFF' }]}>{unreadCount}</Text>
        </View> : channel.access !== 'open' && !joined ? <SF name={pending ? 'clock' : 'lock.fill'} size={14} color={C.secondary} /> : null}
      </View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16 },
  content: { flex: 1, minWidth: 0, paddingVertical: 14, paddingRight: 16, minHeight: 92, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  name: { flex: 1, fontWeight: '600', letterSpacing: -0.3 }, date: { flexShrink: 0 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8 }, previewText: { flex: 1 },
  badge: { minWidth: 24, minHeight: 24, borderRadius: 14, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, fontWeight: '600' },
});
