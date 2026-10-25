// Плитка канала для ленты «Сообщества»: обложка, аватар, название целиком и одна строка
// о главном — сколько нового (для подписчика) или сколько участников.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Channel } from '../data/channel';
import { fmtInt } from '../data/format';
import { count, word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { nums, shadows } from '../theme/tokens';
import { ChannelAvatar } from './ChannelAvatar';

export function CommunityChannelTile({ channel, joined, unread = 0, onPress }: { channel: Channel; joined: boolean; unread?: number; onPress: () => void }) {
  const { T, ty, isDark } = useTheme();
  const closed = channel.access === 'request';
  const status = unread > 0 ? count(unread, 'новая', 'новые', 'новых')
    : joined ? 'Вы участник'
    : channel.memberCount != null ? `${fmtInt(channel.memberCount)} ${word(channel.memberCount, 'участник', 'участника', 'участников')}`
    : count(channel.postCount, 'публикация', 'публикации', 'публикаций');
  return <Pressable onPress={onPress} accessibilityRole="button"
    accessibilityLabel={[channel.name, closed ? 'закрытый канал' : null, status].filter(Boolean).join('. ')}
    style={({ pressed }) => [styles.tile, shadows.tappable, { backgroundColor: T.cardBg, opacity: pressed ? 0.88 : 1 }]}>
    <View style={[styles.clip, isDark ? { borderWidth: 0.5, borderColor: T.cardBorder } : null]}>
      <View style={styles.cover}>
        {channel.avatar ? <Image source={{ uri: channel.avatar }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={18} cachePolicy="memory-disk" />
          : <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      </View>
      <View style={styles.body}>
        <View style={styles.avatar}><ChannelAvatar name={channel.name} uri={channel.avatar} locked={closed} ring /></View>
        <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={2}>{channel.name}</Text>
        <View style={styles.status}>
          {unread > 0 ? <View style={[styles.dot, { backgroundColor: T.brand }]} /> : null}
          <Text style={[ty.footnote, nums, { color: unread > 0 ? T.brandText : T.labelSecondary }]} numberOfLines={1}>{status}</Text>
        </View>
      </View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  tile: { width: 148, borderRadius: 16, borderCurve: 'continuous' },
  clip: { flex: 1, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  cover: { height: 64, overflow: 'hidden' },
  body: { flex: 1, paddingHorizontal: 12, paddingBottom: 12, gap: 4 },
  avatar: { marginTop: -30, marginLeft: -4, marginBottom: 2, alignSelf: 'flex-start' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto' },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
