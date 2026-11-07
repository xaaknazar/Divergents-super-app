import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServerChannel, ServerChannelPost } from '../data/api';
import { useTheme } from '../theme/ThemeContext';
import type { ChannelHeroProps } from './ChannelHero';
import { ChannelPostCard } from './ChannelPostCard';
import { ChannelFeedHeader, ChannelPostFilter } from './ChannelFeedHeader';
import { ChannelFloatingHeader } from './ChannelFloatingHeader';
import { ChannelGlassControl } from './ChannelGlassControl';
import { ChannelDateDivider } from './ChannelDateDivider';
import { ChannelInfoSheet } from './ChannelInfoSheet';
import { ChannelSearch } from './ChannelSearch';
import { useChannelAppearance } from './useChannelAppearance';
import { Aurora } from './Aurora';
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
/** View only: membership checks stay in place; API and playback remain screen-owned. */
export function ChannelDetailView({ channel, loading = false, refreshing = false, playingId,
  onBack, onModerate, onRefresh, onPlay, onReact, onDeletePost, ...hero }: ChannelDetailViewProps) {
  const C = useChannelAppearance();
  const { reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ChannelPostFilter>('all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [info, setInfo] = useState(false);
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(70);
  const [footerHeight, setFooterHeight] = useState(70);
  const list = useRef<FlatList<ServerChannelPost>>(null);
  const afterDismiss = useRef<(() => void) | null>(null);
  useEffect(() => { setQuery(''); setFilter('all'); setSearching(false); setInfo(false); }, [channel?.id]);
  const joined = hero.membership === 'subscribed' || hero.membership === 'approved';
  const pending = hero.membership === 'requested';
  const unlocked = !!channel && (hero.owner || channel.access === 'open' || joined);
  const effectiveFilter = channel?.posts.some(p => p.type === filter) ? filter : 'all';
  const posts = useMemo(() => !unlocked || !channel ? [] : channel.posts
    .filter(p => (!searching || effectiveFilter === 'all' || p.type === effectiveFilter)
      && (!query.trim() || `${p.title} ${p.body ?? ''}`.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'))))
    .slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [channel, unlocked, searching, effectiveFilter, query]);
  const finishDismiss = () => { const action = afterDismiss.current; afterDismiss.current = null; action?.(); };
  const fromInfo = (action: () => void) => {
    afterDismiss.current = action; setInfo(false);
    if (Platform.OS !== 'ios') finishDismiss();
  };
  const closeSearch = () => { setSearching(false); setQuery(''); setFilter('all'); };
  const actionLabel = hero.owner ? 'Написать' : joined ? 'О канале' : pending ? 'Запрос отправлен' : channel?.access === 'open' ? 'Подписаться' : 'Запросить доступ';
  return <View style={[styles.screen, { backgroundColor: C.background }]}>
    <Aurora />
    {loading && !channel ? <Wrapper flex={1} justify="center"><ContentLoading /></Wrapper> : !channel ? <Wrapper padding={24} flex={1} justify="center">
      <EmptyState icon="tray" title="Канал не найден" subtitle="Возможно, он ещё публикуется или был удалён." />
      <Button label="Обновить" icon="arrow.clockwise" loading={refreshing} onPress={onRefresh} />
    </Wrapper> : <FlatList ref={list} key={channel.id} data={posts} inverted={posts.length > 0}
      keyExtractor={post => post.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={[styles.content, posts.length === 0 ? { flexGrow: 1, justifyContent: 'center', paddingTop: headerHeight + insets.top + 16, paddingBottom: footerHeight + insets.bottom + 20 }
        : { paddingTop: footerHeight + insets.bottom + 18, paddingBottom: headerHeight + insets.top + 16 }]}
      showsVerticalScrollIndicator={false} refreshing={refreshing} onRefresh={onRefresh}
      onScroll={e => setAwayFromLatest(e.nativeEvent.contentOffset.y > 240)} scrollEventThrottle={100}
      ListEmptyComponent={<Wrapper paddingHorizontal={24}>
        <EmptyState icon={!unlocked ? 'lock.fill' : searching ? 'magnifyingglass' : 'text.bubble'}
          title={!unlocked ? pending ? 'Запрос на рассмотрении' : 'Доступ по запросу' : searching ? 'Ничего не найдено' : hero.owner ? 'Опубликуйте первый пост' : 'Здесь пока тихо'}
          subtitle={!unlocked ? pending ? 'Владелец одобрит запрос, и публикации откроются.' : 'Отправьте запрос, чтобы видеть публикации.'
            : searching ? 'Попробуйте другое слово или смените фильтр.' : hero.owner ? 'Поделитесь статьёй или голосовым сообщением.' : 'Автор ещё не публиковал. Загляните позже.'} />
      </Wrapper>}
      renderItem={({ item, index }) => <View>
        {index === posts.length - 1 || new Date(posts[index + 1].createdAt).toDateString() !== new Date(item.createdAt).toDateString()
          ? <ChannelDateDivider date={item.createdAt} /> : null}
        <ChannelPostCard post={item} author={channel.name} owner={hero.owner} playing={playingId === item.id}
          onPlay={() => onPlay(item.id)} onReact={emoji => onReact(item.id, emoji)} onDelete={() => onDeletePost(item.id)} />
      </View>} />}
    <View pointerEvents="box-none" style={[styles.header, { top: insets.top + 8 }]} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
      <ChannelFloatingHeader name={channel?.name ?? 'Канал'} avatar={channel?.avatarUrl} members={channel?._count?.members}
        onBack={onBack} onInfo={() => { if (channel) setInfo(true); }} />
      {searching && unlocked && channel ? <View style={[styles.searchPanel, { backgroundColor: C.surface }]}>
        <ChannelSearch value={query} onChange={setQuery} onClose={closeSearch} placeholder="Поиск по публикациям" />
        <ChannelFeedHeader posts={channel.posts} value={effectiveFilter} onChange={setFilter} />
      </View> : null}
    </View>
    {channel ? <View pointerEvents="box-none" style={[styles.footer, { bottom: Math.max(insets.bottom, 12) }]} onLayout={e => setFooterHeight(e.nativeEvent.layout.height)}>
      {awayFromLatest && posts.length > 0 ? <View style={styles.latest}><ChannelGlassControl icon="chevron.down" label="К последней публикации" onPress={() => list.current?.scrollToOffset({ offset: 0, animated: !reduceMotion })} /></View> : null}
      <View style={styles.controls}>
        <View style={styles.action}><ChannelGlassControl label={actionLabel} caption={actionLabel} icon={hero.owner ? 'square.and.pencil' : undefined}
          disabled={pending && !hero.owner} busy={hero.busy} onPress={hero.owner ? hero.onCreatePost : joined ? () => setInfo(true) : hero.onJoin} /></View>
        {unlocked ? <ChannelGlassControl icon={searching ? 'xmark' : 'magnifyingglass'} label={searching ? 'Закрыть поиск' : 'Поиск по каналу'} onPress={searching ? closeSearch : () => setSearching(true)} /> : null}
      </View>
    </View> : null}
    <Modal visible={info && !!channel} animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={() => setInfo(false)} onDismiss={finishDismiss}>
      {channel ? <ChannelInfoSheet {...hero} channel={channel} onClose={() => setInfo(false)}
        onCreatePost={() => fromInfo(hero.onCreatePost)} onManage={() => fromInfo(hero.onManage)}
        onRequests={() => fromInfo(hero.onRequests)} onModerate={() => fromInfo(onModerate)} /> : null}
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { width: '100%', maxWidth: 700, alignSelf: 'center' },
  header: { position: 'absolute', left: 0, right: 0, maxWidth: 700, width: '100%', alignSelf: 'center', gap: 8 },
  searchPanel: { marginHorizontal: 12, padding: 10, borderRadius: 24, gap: 8 },
  footer: { position: 'absolute', left: 14, right: 14, maxWidth: 672, alignSelf: 'center', gap: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  action: { flex: 1, alignItems: 'center' }, latest: { alignItems: 'flex-end' },
});
