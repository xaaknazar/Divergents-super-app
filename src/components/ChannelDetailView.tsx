import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServerChannel } from '../data/api';
import { useTheme } from '../theme/ThemeContext';
import { ChannelHero, ChannelHeroProps } from './ChannelHero';
import { ChannelPostCard } from './ChannelPostCard';
import { ChannelFeedHeader, ChannelPostFilter } from './ChannelFeedHeader';
import { NavHeader } from './NavHeader';
import { HeaderIcon } from './HeaderIcon';
import { ContentLoading } from './ContentLoading';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { Wrapper } from './Wrapper';

export interface ChannelDetailViewProps extends Omit<ChannelHeroProps, 'channel'> {
  channel: ServerChannel | null;
  loading?: boolean;
  refreshing?: boolean;
  playingId?: string | null;
  onBack: () => void;
  onModerate: () => void;
  onRefresh: () => void;
  onPlay: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  onDeletePost: (id: string) => void;
}
/** Pure view: no Clerk, persistence or API. The screen owns all permissions and writes. */
export function ChannelDetailView({ channel, loading = false, refreshing = false, playingId,
  onBack, onModerate, onRefresh, onPlay, onReact, onDeletePost, ...hero }: ChannelDetailViewProps) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ChannelPostFilter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const unlocked = !!channel && (hero.owner || channel.access === 'open' || hero.membership === 'subscribed' || hero.membership === 'approved');
  // Deleting the last audio/article cannot strand the feed on an invisible filter.
  const effectiveFilter = channel?.posts.some(p => p.type === filter) ? filter : 'all';
  const posts = unlocked ? channel!.posts.filter(p => effectiveFilter === 'all' || p.type === effectiveFilter) : [];
  return <View style={[styles.screen, { backgroundColor: T.groupedBg }]}>
    <NavHeader backLabel="Каналы" onBack={onBack}
      trailing={channel && !hero.owner ? <HeaderIcon name="ellipsis" label="Пожаловаться или заблокировать" onPress={onModerate} /> : undefined} />
    {loading && !channel ? <ContentLoading /> : !channel ? <Wrapper padding={24}>
      <EmptyState icon="tray" title="Канал не найден" subtitle="Возможно, он ещё публикуется или был удалён." />
      <Button label="Обновить" icon="arrow.clockwise" loading={refreshing} onPress={onRefresh} />
    </Wrapper> : <FlatList key={channel.id} data={posts} keyExtractor={post => post.id}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false} refreshing={refreshing} onRefresh={onRefresh}
      ListHeaderComponent={<><ChannelHero channel={channel} {...hero} />
        {unlocked ? <ChannelFeedHeader posts={channel.posts} value={effectiveFilter} onChange={setFilter} /> : null}</>}
      ListEmptyComponent={<Wrapper paddingHorizontal={20}>
        <EmptyState icon={!unlocked ? 'lock.fill' : 'text.bubble'}
          title={!unlocked ? hero.membership === 'requested' ? 'Запрос на рассмотрении' : 'Доступ по запросу' : hero.owner ? 'Опубликуйте первый пост' : 'Здесь пока тихо'}
          subtitle={!unlocked ? hero.membership === 'requested' ? 'Владелец одобрит запрос, и публикации откроются.' : 'Отправьте запрос, чтобы видеть публикации.'
            : hero.owner ? 'Поделитесь статьёй или голосовым сообщением — участники увидят его здесь.' : 'Автор ещё не публиковал. Загляните позже.'} />
      </Wrapper>}
      renderItem={({ item }) => <Wrapper paddingHorizontal={16} marginBottom={16}>
        <ChannelPostCard post={item} owner={hero.owner} playing={playingId === item.id}
          expanded={!!expanded[item.id]} onExpand={() => setExpanded(v => ({ ...v, [item.id]: !v[item.id] }))}
          onPlay={() => onPlay(item.id)} onReact={emoji => onReact(item.id, emoji)} onDelete={() => onDeletePost(item.id)} />
      </Wrapper>} />}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { width: '100%', maxWidth: 700, alignSelf: 'center' },
});
