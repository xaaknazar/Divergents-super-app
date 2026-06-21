import React, { useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { useNotifications } from '../../state/NotificationsContext';
import { RootStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParams, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, unread, markRead, markAllRead } = useNotifications();

  useEffect(() => () => { markAllRead(); }, []); // mark all read when leaving

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Text style={[ty.body, { color: T.brandAccent }]}>Закрыть</Text></Pressable>
        <Text style={[ty.headline, { color: T.label }]}>Уведомления</Text>
        <Pressable onPress={markAllRead} hitSlop={8} disabled={unread === 0}>
          <Text style={[ty.subhead, { color: unread ? T.brandAccent : T.labelTertiary }]}>Прочитать</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        {items.map((it) => (
          <Pressable key={it.id} onPress={() => markRead(it.id)}
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
              <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 4 }]}>{it.date}</Text>
            </View>
            <View style={{ position: 'absolute', bottom: 0, left: 68, right: 0, height: 0.5, backgroundColor: T.separator }} />
          </Pressable>
        ))}
        {items.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <SF name="bell.fill" size={32} color={T.labelTertiary} />
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10 }]}>Уведомлений пока нет</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
