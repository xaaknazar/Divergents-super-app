import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ServerChannelPost } from '../data/api';
import { SF } from './SFIcon';
import { useChannelAppearance } from './useChannelAppearance';

import { channelReactions } from '../data/channelReactions';
export interface ChannelPostBubbleProps {
  post: ServerChannelPost;
  author?: string;
  owner?: boolean;
  playing?: boolean;
  onPlay: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onRequestReactions?: () => void;
}

export function ChannelPostBubble({ post, author, owner = false, playing = false, onPlay, onReact, onDelete, onRequestReactions }: ChannelPostBubbleProps) {
  const C = useChannelAppearance();
  const actions = onRequestReactions ? [{ name: 'react', label: 'Выбрать реакцию' }] : undefined;
  const date = new Date(post.createdAt);
  const time = isNaN(date.getTime()) ? '' : date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const visibleReactions = channelReactions.filter(({ emoji }) => (post.reactions?.[emoji] ?? 0) > 0 || post.myReaction === emoji);
  return <View style={[styles.bubble, { backgroundColor: C.bubble }]}>
      {author ? <Text style={[styles.author, { color: C.accent, fontSize: 15 * C.textScale }]}>{author}</Text> : null}
      {post.title ? <Text accessibilityRole="header" accessibilityActions={actions} onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'react') onRequestReactions?.(); }} accessibilityHint={onRequestReactions ? 'Удерживайте сообщение, чтобы выбрать реакцию' : undefined} style={[styles.title, { color: C.label, fontSize: 17 * C.textScale }]}>{post.title}</Text> : null}
      {post.type === 'audio' && post.audioUrl ? <Pressable onPress={onPlay} accessibilityRole="button"
        accessibilityLabel={playing ? 'Приостановить аудио' : 'Слушать аудио'} accessibilityState={{ selected: playing }}
        style={({ pressed }) => [styles.audio, { opacity: pressed ? 0.6 : 1 }]}>
        <View style={[styles.play, { backgroundColor: C.accent }]}>
          <SF name={playing ? 'pause.fill' : 'play.fill'} size={22} color={C.isDark ? '#192A45' : '#FFFFFF'} />
        </View>
        <View style={styles.audioCopy}>
          <Text style={{ fontSize: 16 * C.textScale, color: C.accent, fontWeight: '600' }}>{playing ? 'Воспроизводится' : 'Голосовое сообщение'}</Text>
          <Text style={{ fontSize: 13 * C.textScale, color: C.secondary }}>{playing ? 'Нажмите для паузы' : 'Нажмите, чтобы слушать'}</Text>
        </View>
      </Pressable> : null}
      {post.body ? <Text accessibilityActions={actions} onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'react') onRequestReactions?.(); }} style={[styles.body, { color: C.label, fontSize: 17 * C.textScale, lineHeight: 23 * C.textScale }]}>{post.body}</Text> : null}
      <View style={styles.footer}>
        <View style={styles.reactions}>
          {visibleReactions.map(({ emoji, label }) => {
            const selected = post.myReaction === emoji;
            const count = post.reactions?.[emoji] ?? 0;
            return <Pressable key={emoji} onPress={() => onReact(emoji)}
              accessibilityRole="button" accessibilityLabel={`${label}${count ? `: ${count}` : ''}`}
              accessibilityState={{ selected }} style={styles.reactionTarget}>
              <View style={[styles.reaction, { backgroundColor: selected ? C.selected : C.reaction }]}>
                <Text style={styles.emoji}>{emoji}</Text>
                {count > 0 ? <Text style={{ fontSize: 14 * C.textScale, color: selected ? C.accent : C.label }}>{count}</Text> : null}
              </View>
            </Pressable>;
          })}
        </View>
        <View style={styles.timeRow}>
          {owner ? <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Удалить публикацию" style={styles.delete}>
            <SF name="trash.fill" size={16} color={C.secondary} />
          </Pressable> : null}
          <Text style={{ fontSize: 12 * C.textScale, color: C.secondary }}>{time}</Text>
        </View>
      </View>

  </View>;
}
const styles = StyleSheet.create({
  bubble: { minWidth: 0, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 3, borderRadius: 20, borderBottomLeftRadius: 5, gap: 5 },
  author: { fontWeight: '600' }, title: { fontWeight: '600' }, body: { paddingTop: 2 },
  audio: { paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  audioCopy: { flex: 1, minWidth: 0, gap: 3 },
  footer: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 6 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', flexShrink: 1, columnGap: 5 },
  reactionTarget: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  reaction: { minHeight: 32, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  emoji: { fontSize: 19 },
  timeRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 2, paddingBottom: 3 },
  delete: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
