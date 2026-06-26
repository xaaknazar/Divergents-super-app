import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { useNotifications } from '../../state/NotificationsContext';
import { NotifTarget } from '../../data/notifications';
import { RootStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParams, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const { items, unread, loading, error, refresh, markRead, markAllRead } = useNotifications();

  // Open the notification's target content. Dispatching navigate to the (lower)
  // 'Tabs' route pops this modal and jumps into the right tab + stack screen.
  const open = (id: string, target?: NotifTarget | null) => {
    markRead(id);
    if (!target) return;
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Tabs',
        params: { screen: target.tab, params: { screen: target.screen, params: target.params } },
      }),
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Text style={[ty.body, { color: T.brandAccent }]}>{tr('Закрыть')}</Text></Pressable>
        <Text style={[ty.headline, { color: T.label }]}>{tr('Уведомления')}</Text>
        <Pressable onPress={markAllRead} hitSlop={8} disabled={unread === 0}>
          <Text style={[ty.subhead, { color: unread ? T.brandAccent : T.labelTertiary }]}>{tr('Прочитать')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 30, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {items.map((it) => (
            <Pressable key={it.id} onPress={() => open(it.id, it.target)}
              style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: it.read ? 'transparent' : T.brandTintedStrong }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: it.color + '33', alignItems: 'center', justifyContent: 'center' }}>
                <SF name={it.icon} size={20} color={it.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[ty.headline, { color: T.label, flex: 1 }]} numberOfLines={1}>{it.title}</Text>
                  {!it.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.brand }} /> : null}
                </View>
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{it.body}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={[ty.caption2, { color: T.labelTertiary }]}>{it.date}</Text>
                  {it.target ? <SF name="chevron.right" size={12} color={T.labelTertiary} /> : null}
                </View>
              </View>
              <View style={{ position: 'absolute', bottom: 0, left: 68, right: 0, height: 0.5, backgroundColor: T.separator }} />
            </Pressable>
          ))}

          {items.length === 0 ? (
            <View style={{ flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={error ? 'wifi.slash' : 'bell.fill'} size={32} color={T.labelTertiary} />
              <Text style={[ty.headline, { color: T.label, marginTop: 12, textAlign: 'center' }]}>
                {error
                  ? (lang === 'ru' ? 'Не удалось загрузить' : 'Couldn’t load')
                  : tr('Уведомлений пока нет')}
              </Text>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4, textAlign: 'center' }]}>
                {error
                  ? (lang === 'ru' ? 'Проверьте подключение и попробуйте снова.' : 'Check your connection and try again.')
                  : (lang === 'ru' ? 'Здесь появятся новости, челленджи и события.' : 'News, challenges and events will appear here.')}
              </Text>
              {error ? (
                <Pressable onPress={refresh} hitSlop={8} style={{ marginTop: 16, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 12, backgroundColor: T.brandTinted }}>
                  <Text style={[ty.subheadEm, { color: T.brand }]}>{lang === 'ru' ? 'Повторить' : 'Retry'}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
