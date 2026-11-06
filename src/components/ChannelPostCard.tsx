import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import type { ServerChannelPost } from '../data/api';
import { SF } from './SFIcon';
import { useChannelAppearance } from './useChannelAppearance';

const reactions = ['👍', '❤️', '🔥', '👏', '🙏'];
const reactionNames = ['Нравится', 'Любовь', 'Огонь', 'Аплодисменты', 'Спасибо'];
export interface ChannelPostCardProps {
  post: ServerChannelPost;
  author?: string;
  owner?: boolean;
  playing?: boolean;
  onPlay: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
}

export function ChannelPostCard({ post, author, owner = false, playing = false, onPlay, onReact, onDelete }: ChannelPostCardProps) {
  const C = useChannelAppearance();
  const [choosingReaction, setChoosingReaction] = useState(false);
  const date = new Date(post.createdAt);
  const time = isNaN(date.getTime()) ? '' : date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const visibleReactions = reactions.filter(emoji => choosingReaction || (post.reactions?.[emoji] ?? 0) > 0 || post.myReaction === emoji);
  return <View style={styles.messageRow}>
    <View style={[styles.bubble, { backgroundColor: C.bubble }]}>
      {author ? <Text style={[styles.author, { color: C.accent, fontSize: 15 * C.textScale }]}>{author}</Text> : null}
      {post.title ? <Text accessibilityRole="header" selectable style={[styles.title, { color: C.label, fontSize: 17 * C.textScale }]}>{post.title}</Text> : null}
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
      {post.body ? <Text selectable style={[styles.body, { color: C.label, fontSize: 17 * C.textScale, lineHeight: 23 * C.textScale }]}>{post.body}</Text> : null}
      <View style={styles.footer}>
        <View style={styles.reactions}>
          {visibleReactions.map(emoji => {
            const selected = post.myReaction === emoji;
            const count = post.reactions?.[emoji] ?? 0;
            return <Pressable key={emoji} onPress={() => { onReact(emoji); setChoosingReaction(false); }}
              accessibilityRole="button" accessibilityLabel={`${reactionNames[reactions.indexOf(emoji)]}${count ? `: ${count}` : ''}`}
              accessibilityState={{ selected }} style={styles.reactionTarget}>
              <View style={[styles.reaction, { backgroundColor: selected ? C.selected : C.reaction }]}>
                <Text style={styles.emoji}>{emoji}</Text>
                {count > 0 ? <Text style={{ fontSize: 14 * C.textScale, color: selected ? C.accent : C.label }}>{count}</Text> : null}
              </View>
            </Pressable>;
          })}
          <Pressable accessibilityRole="button" accessibilityLabel={choosingReaction ? 'Закрыть реакции' : 'Добавить реакцию'}
            accessibilityState={{ expanded: choosingReaction }} onPress={() => setChoosingReaction(v => !v)} style={styles.reactionTarget}>
            <View style={[styles.addReaction, { backgroundColor: C.reaction }]}><SF name={choosingReaction ? 'xmark' : 'face.smiling'} size={19} color={C.secondary} /></View>
          </Pressable>
        </View>
        <View style={styles.timeRow}>
          {owner ? <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Удалить публикацию" style={styles.delete}>
            <SF name="trash.fill" size={16} color={C.secondary} />
          </Pressable> : null}
          <Text style={{ fontSize: 12 * C.textScale, color: C.secondary }}>{time}</Text>
        </View>
      </View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Поделиться публикацией"
      onPress={() => { Share.share({ message: [author, post.title, post.body, post.audioUrl].filter(Boolean).join('\n\n') }).catch(() => {}); }}
      style={styles.shareTarget}>
      <View style={[styles.share, { backgroundColor: C.bubble }]}><SF name="arrowshape.turn.up.right.fill" size={18} color={C.label} /></View>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 10, paddingRight: 6, gap: 2, paddingBottom: 5 },
  bubble: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 3, borderRadius: 20, borderBottomLeftRadius: 5, gap: 5 },
  author: { fontWeight: '600' }, title: { fontWeight: '600' }, body: { paddingTop: 2 },
  audio: { paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  audioCopy: { flex: 1, minWidth: 0, gap: 3 },
  footer: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 6 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', flexShrink: 1, columnGap: 5 },
  reactionTarget: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  reaction: { minHeight: 32, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  emoji: { fontSize: 19 }, addReaction: { height: 32, width: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  timeRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 2, paddingBottom: 3 },
  delete: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  shareTarget: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  share: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
