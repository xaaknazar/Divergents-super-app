import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ServerChannelPost } from '../data/api';
import { fmtDateTime } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { SF } from './SFIcon';

const reactions = ['👍', '❤️', '🔥', '👏', '🙏'];
const reactionNames = ['Нравится', 'Любовь', 'Огонь', 'Аплодисменты', 'Спасибо'];
export interface ChannelPostCardProps {
  post: ServerChannelPost;
  owner?: boolean;
  playing?: boolean;
  expanded?: boolean;
  onExpand: () => void;
  onPlay: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
}

export function ChannelPostCard({ post, owner = false, playing = false, expanded = false,
  onExpand, onPlay, onReact, onDelete }: ChannelPostCardProps) {
  const { T, ty } = useTheme();
  const audio = post.type === 'audio';
  const long = !audio && (post.body?.length ?? 0) > 260;
  const date = new Date(post.createdAt);
  const dateLabel = isNaN(date.getTime()) ? '' : fmtDateTime(date, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return <View style={[styles.card, { backgroundColor: T.cardBg }]}>
    <View style={styles.header}>
      <View style={styles.identity}>
        {post.title ? <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>{post.title}</Text> : null}
        <View style={styles.metadata}>
          <Text style={[ty.footnote, { color: T.labelSecondary }]}>{audio ? 'Аудио' : 'Статья'}</Text>
          {dateLabel ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>· {dateLabel}</Text> : null}
        </View>
      </View>
      {owner ? <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Удалить публикацию"
        style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.5 : 1 }]}>
        <SF name="trash" size={18} color={T.labelSecondary} />
      </Pressable> : null}
    </View>
    {audio && post.audioUrl ? <Pressable onPress={onPlay} accessibilityRole="button"
      accessibilityLabel={playing ? 'Приостановить аудио' : 'Слушать аудио'} accessibilityState={{ selected: playing }}
      style={({ pressed }) => [styles.audio, { backgroundColor: T.brandTinted, opacity: pressed ? 0.75 : 1 }]}>
      <View style={[styles.play, { backgroundColor: T.brand }]}><SF name={playing ? 'pause.fill' : 'play.fill'} size={18} color={T.onBrand} /></View>
      <View style={styles.audioCopy}><Text style={[ty.headline, { color: T.brandText }]}>{playing ? 'Воспроизводится' : 'Слушать аудио'}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{playing ? 'Нажмите, чтобы поставить на паузу' : 'Голосовое сообщение'}</Text></View>
    </Pressable> : post.body ? <View>
      <Text style={[ty.body, { color: T.label }]} numberOfLines={long && !expanded ? 6 : undefined}>{post.body}</Text>
      {long ? <View style={styles.more}><Button label={expanded ? 'Свернуть' : 'Читать далее'} variant="plain" size="compact" expanded={expanded} onPress={onExpand} /></View> : null}
    </View> : null}
    <View style={[styles.reactions, { borderTopColor: T.separator }]}>
      {reactions.map((emoji, index) => {
        const selected = post.myReaction === emoji;
        const count = post.reactions?.[emoji] ?? 0;
        return <Pressable key={emoji} onPress={() => onReact(emoji)} accessibilityRole="button"
          accessibilityLabel={`${reactionNames[index]}${count ? `: ${count}` : ''}`}
          accessibilityState={{ selected }}
          style={({ pressed }) => [styles.reaction, { backgroundColor: selected ? T.brandTinted : T.fillTertiary, opacity: pressed ? 0.65 : 1 }]}>
          <Text style={styles.emoji}>{emoji}</Text>
          {count > 0 ? <Text style={[ty.footnoteEm, { color: selected ? T.brandText : T.labelSecondary }]}>{count}</Text> : null}
        </Pressable>;
      })}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 20, gap: 14, borderRadius: 26, borderCurve: 'continuous' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  identity: { flex: 1, minWidth: 0, gap: 6 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 5, rowGap: 2 },
  delete: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  audio: { padding: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  audioCopy: { flex: 1, minWidth: 0, gap: 3 }, more: { alignSelf: 'flex-start', marginTop: 4 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
  reaction: { minWidth: 48, minHeight: 48, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  emoji: { fontSize: 18 },
});
