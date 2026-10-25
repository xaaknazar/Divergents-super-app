// Публикация канала: кто и когда, заголовок, текст (длинный — свёрнут) или голосовое,
// реакции. У автора канала — меню «…» с удалением.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { channelTimeLabel } from '../data/channel';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, nums, radius } from '../theme/tokens';
import { ChannelReactions } from './ChannelReactions';
import { ChannelVoicePlayer } from './ChannelVoicePlayer';
import { SF } from './SFIcon';

export type ChannelPostView = { id: string; type: 'article' | 'audio'; title: string; body?: string | null; audioUrl?: string | null;
  createdAt: string; reactions?: Record<string, number>; myReaction?: string | null };

const LONG = 280;
function readMins(text: string) { return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 180)); }

export function ChannelPostCard({ post, reactionOptions, expanded = false, playing = false,
  onToggleExpanded, onPlay, onReact, onMore }: {
  post: ChannelPostView; reactionOptions: readonly string[];
  expanded?: boolean; playing?: boolean; onToggleExpanded?: () => void; onPlay?: () => void; onReact: (emoji: string) => void;
  /** Только у автора канала. */
  onMore?: () => void;
}) {
  const { T, ty, isDark } = useTheme();
  const audio = post.type === 'audio';
  const body = post.body?.trim() ?? '';
  const long = !audio && body.length > LONG;
  const kind = audio ? 'Голосовое' : body ? `${readMins(body)} мин чтения` : 'Статья';
  return <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: isDark ? T.cardBorder : 'transparent' }]}>
    <View style={styles.head}>
      <View style={[styles.kind, { backgroundColor: T.brandTinted }]}><SF name={audio ? 'waveform' : 'doc.text.fill'} size={14} color={T.brandText} /></View>
      <Text style={[ty.footnote, nums, styles.byline, { color: T.labelSecondary }]} numberOfLines={1}>{[channelTimeLabel(post.createdAt), kind].filter(Boolean).join(' · ')}</Text>
      {onMore ? <Pressable onPress={onMore} accessibilityRole="button" accessibilityLabel="Действия с публикацией" hitSlop={6}
        style={({ pressed }) => [styles.more, { opacity: pressed ? 0.5 : 1 }]}>
        <SF name="ellipsis" size={18} color={T.labelSecondary} />
      </Pressable> : null}
    </View>
    {post.title ? <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>{post.title}</Text> : null}
    {audio && post.audioUrl ? <ChannelVoicePlayer seed={post.id} playing={playing} onToggle={() => onPlay?.()} />
      : body ? <View style={styles.text}>
        <Text style={[ty.body, { color: T.label }]} numberOfLines={long && !expanded ? 6 : undefined}>{body}</Text>
        {long ? <Pressable onPress={onToggleExpanded} accessibilityRole="button" accessibilityState={{ expanded }} hitSlop={6}>
          <Text style={[ty.subheadEm, { color: T.brandText }]}>{expanded ? 'Свернуть' : 'Читать далее'}</Text>
        </Pressable> : null}
      </View> : null}
    <ChannelReactions options={reactionOptions} counts={post.reactions} mine={post.myReaction} onReact={onReact} />
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 0.5 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  byline: { flex: 1, minWidth: 0 },
  kind: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  more: { width: minTouch - 8, height: minTouch - 8, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  text: { gap: 6 },
});
