import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Channel } from '../data/channel';
import { word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { ChannelArtwork } from './ChannelArtwork';
import { SF } from './SFIcon';

export interface ChannelCardProps {
  channel: Channel;
  postCount: number;
  membership?: string | null;
  unreadCount?: number;
  latestTitle?: string;
  variant?: 'featured' | 'list';
  onOpen: () => void;
}

/** One whole-card target; the footer is a label, not a nested button. */
export function ChannelCard({ channel, postCount, membership, unreadCount = 0, latestTitle,
  variant = 'list', onOpen }: ChannelCardProps) {
  const { T, ty, textScale = 1 } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [cardWidth, setCardWidth] = useState(width);
  const featured = variant === 'featured';
  const stacked = fontScale * textScale >= 1.2 || (featured && cardWidth < 318);
  const joined = membership === 'subscribed' || membership === 'approved';
  const pending = membership === 'requested';
  const access = channel.access === 'open' ? tr('Открытый канал') : tr('По запросу');
  const status = pending ? tr('Запрос отправлен') : joined ? tr('Вы подписаны') : access;
  const description = joined && latestTitle ? latestTitle : channel.bio?.trim();
  const countLabel = `${postCount} ${tr(word(postCount, 'публикация', 'публикации', 'публикаций'))}`;
  return <Pressable onPress={onOpen} accessibilityRole="button"
    onLayout={({ nativeEvent }) => setCardWidth(nativeEvent.layout.width)}
    accessibilityLabel={`${tr('Канал')} ${channel.name}. ${status}. ${countLabel}${joined && unreadCount ? `. ${tr('Новых публикаций')}: ${unreadCount}` : ''}`}
    accessibilityHint={tr('Открыть канал')}
    style={({ pressed }) => [styles.card, { backgroundColor: T.cardBg, opacity: pressed ? 0.78 : 1 }]}>
    <View style={[styles.content, stacked && styles.stacked]}>
      <ChannelArtwork uri={channel.avatar} name={channel.name} size={featured ? 'card' : 'compact'} />
      <View style={[styles.copy, stacked && styles.stackedCopy]}>
        <View style={styles.title}>
          <Text style={[featured ? ty.title3 : ty.headline, styles.grow, { color: T.label }]}>{channel.name}</Text>
          {channel.verified ? <SF name="checkmark.seal.fill" size={16} color={T.brandText} /> : null}
        </View>
        {description ? <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={featured ? 3 : 2}>{description}</Text> : null}
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{countLabel}</Text>
      </View>
      {!featured && !stacked ? <SF name="chevron.right" size={13} color={T.labelSecondary} /> : null}
    </View>
    <View style={[styles.footer, { borderTopColor: T.separator }]}>
      <View style={styles.status}>
        <SF name={pending ? 'clock' : joined ? 'checkmark.circle.fill' : channel.access === 'open' ? 'globe' : 'lock.fill'} size={14} color={T.labelSecondary} />
        <Text style={[ty.footnote, styles.grow, { color: T.labelSecondary }]}>{status}</Text>
      </View>
      {joined && unreadCount > 0 ? <Text style={[ty.footnoteEm, { color: T.brandText }]}>{tr('Новых')}: {unreadCount}</Text>
        : featured ? <View style={styles.open}><Text style={[ty.footnoteEm, { color: T.brandText }]}>{tr('Открыть')}</Text><SF name="arrow.right" size={14} color={T.brandText} /></View> : null}
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 26, borderCurve: 'continuous' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  copy: { flex: 1, minWidth: 0, gap: 7 }, title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stackedCopy: { flex: 0, width: '100%' },
  grow: { flexShrink: 1 },
  footer: { marginHorizontal: 18, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  open: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
