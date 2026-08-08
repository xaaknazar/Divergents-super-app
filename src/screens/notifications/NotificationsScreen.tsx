import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, FlatList, RefreshControl, InteractionManager } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { ListSkeleton, EmptyState, ErrorState } from '../../components/StateViews';
import { useNotifications } from '../../state/NotificationsContext';
import { NotifTarget } from '../../data/notifications';
import { RootStackParams } from '../../navigation/types';
import { navigationRef } from '../../navigation/ref';

function fmtDate(iso: string, ru: boolean): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (m < 1) return ru ? 'только что' : 'just now';
  if (m < 60) return ru ? `${m} мин назад` : `${m} min ago`;
  if (h < 24) return ru ? `${h} ч назад` : `${h}h ago`;
  if (days < 7) return ru ? `${days} дн назад` : `${days}d ago`;
  return d.toLocaleDateString(ru ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
}

type Props = NativeStackScreenProps<RootStackParams, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const { items, unread, loading, error, refresh, markRead, markAllRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  // Render the (heavy) list only AFTER the modal open animation finishes — a
  // lightweight skeleton shows during the slide-up so the transition stays 60fps.
  const [ready, setReady] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Silent: the pull-to-refresh spinner is our own; don't toggle global loading
    // (which would re-render every screen with a bell badge).
    try { await refresh(true); } finally { setRefreshing(false); }
  }, [refresh]);

  // Re-fetch when the modal opens — but only AFTER the open animation finishes,
  // so the network call + re-render never janks the modal slide-up (fixes the
  // "lag on open"). Existing items stay visible meanwhile.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => { setReady(true); void refresh(true); });
    return () => task.cancel();
  }, [refresh]);

  // Open the notification's target content. Stable (useCallback) so the memoized
  // rows aren't invalidated every render — that was defeating React.memo.
  const open = useCallback((id: string, target?: NotifTarget | null) => {
    markRead(id);
    if (!target) return;
    // This screen is a full-screen modal. Navigating to the target while the
    // modal was still presented left the destination rendering BEHIND it (it
    // looked like a half-height sheet). Dismiss the modal first, then navigate
    // on the root ref next frame so the target always opens FULL-SCREEN on its
    // tab stack.
    navigation.goBack();
    // Wait for the modal-dismiss animation to FINISH before navigating — doing it
    // on the next frame raced the dismissal and left the target rendering behind
    // the still-closing modal (looked like a half screen over the main one).
    InteractionManager.runAfterInteractions(() => {
      if (navigationRef.isReady()) {
        (navigationRef as any).navigate('Tabs', {
          screen: target.tab,
          params: { screen: target.screen, params: target.params },
        });
      }
    });
  }, [markRead, navigation]);

  // Skeleton during the open animation, and during the very first load.
  const showSkeleton = !ready || (loading && !refreshing && items.length === 0);

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Text style={[ty.body, { color: T.brandAccent }]} numberOfLines={1}>{tr('Закрыть')}</Text></Pressable>
        <Text style={[ty.headline, { color: T.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Уведомления')}</Text>
        <Pressable onPress={markAllRead} hitSlop={8} disabled={unread === 0}>
          <Text style={[ty.subhead, { color: unread ? T.brandAccent : T.labelTertiary }]} numberOfLines={1}>{tr('Прочитать')}</Text>
        </Pressable>
      </View>

      {showSkeleton ? (
        <View style={{ paddingTop: 12 }}>
          <ListSkeleton rows={6} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 30, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brand} />}
          renderItem={({ item: it }) => (
            <NotifRow it={it} T={T} ru={lang === 'ru'} onPress={open} />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {error ? (
                <ErrorState
                  message={lang === 'ru'
                    ? 'Не удалось загрузить уведомления. Проверьте подключение и попробуйте снова.'
                    : 'Couldn’t load notifications. Check your connection and try again.'}
                  onRetry={onRefresh}
                />
              ) : (
                <EmptyState
                  icon="bell.fill"
                  title={tr('Уведомлений пока нет')}
                  subtitle={lang === 'ru'
                    ? 'Здесь появятся новости, челленджи и события. Потяните вниз, чтобы обновить.'
                    : 'News, challenges and events will appear here. Pull down to refresh.'}
                />
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// Memoized row — keeps FlatList re-renders cheap so opening the modal stays smooth.
const NotifRow = React.memo(function NotifRow({ it, T, ru, onPress }: { it: any; T: any; ru: boolean; onPress: (id: string, target?: any) => void }) {
  return (
    <Pressable onPress={() => onPress(it.id, it.target)}
      style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: it.read ? 'transparent' : T.brandTintedStrong }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: (it.color || T.brand) + '33', alignItems: 'center', justifyContent: 'center' }}>
        <SF name={it.icon || 'bell.fill'} size={20} color={it.color || T.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[ty.headline, { color: T.label, flex: 1 }]} numberOfLines={1}>{it.title}</Text>
          {!it.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.brand }} /> : null}
        </View>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={3}>{it.body}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={[ty.caption2, { color: T.labelTertiary }]}>{fmtDate(it.date, ru)}</Text>
          {it.target ? <SF name="chevron.right" size={12} color={T.labelTertiary} /> : null}
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: 68, right: 0, height: 0.5, backgroundColor: T.separator }} />
    </Pressable>
  );
});
