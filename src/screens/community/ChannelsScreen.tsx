// Fullscreen channels list (pushed from Community → "Все"). A dedicated page so
// the list isn't cramped inside the tab root.
import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { useChannel } from '../../state/ChannelContext';
import { tr } from '../../state/LanguageContext';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'Channels'>;

export function ChannelsScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { channels, loading, error, reload, isJoined, unread, postsByChannel } = useChannel();

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={tr('Сообщество')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={undefined}>
        <Text style={[ty.largeTitle, { color: T.label, paddingHorizontal: 4, paddingBottom: 12 }]}>{tr('Каналы')}</Text>
        {loading && channels.length === 0 ? (
          <View style={{ paddingVertical: 44, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
        ) : channels.length === 0 ? (
          error ? <ErrorState onRetry={reload} /> : <EmptyState icon="tray" title={tr('Пока ничего нет')} subtitle={tr('Каналы сообщества появятся здесь.')} />
        ) : channels.map((ch) => {
          const joined = isJoined(ch.id);
          const count = unread(ch.id);
          const posts = postsByChannel(ch.id);
          const closed = ch.access === 'request';
          const initial = (ch.name?.trim()?.[0] ?? 'K').toUpperCase();
          const secondary = joined && posts[0] ? posts[0].title : (ch.bio?.trim() || '');
          return (
            <Pressable key={ch.id} onPress={() => navigation.navigate('ServerChannel', { channelId: ch.id })}
              accessibilityRole="button" accessibilityLabel={`${tr('Канал')} ${ch.name}`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.cardBg, borderRadius: 18, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: T.cardBorder, opacity: pressed ? 0.85 : 1 })}>
              <View>
                {ch.avatar ? (
                  <Image source={{ uri: ch.avatar }} style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: T.brandTinted }} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[ty.title3, { color: '#fff' }]}>{initial}</Text>
                  </LinearGradient>
                )}
                {closed ? (
                  <View style={{ position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: T.cardBg, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: T.labelTertiary, alignItems: 'center', justifyContent: 'center' }}>
                      <SF name="lock.fill" size={9} color="#fff" />
                    </View>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{ch.name}</Text>
                {secondary ? <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{secondary}</Text> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <SF name="doc.text.fill" size={10} color={T.labelTertiary} />
                  <Text style={[ty.caption2, { color: T.labelTertiary }]} numberOfLines={1}>{posts.length}{closed ? ` · ${tr('Закрытый')}` : ` · ${tr('Открытый')}`}</Text>
                </View>
              </View>
              {joined && count > 0 ? (
                <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.caption2Em, { color: '#fff' }]}>{count}</Text>
                </View>
              ) : joined ? (
                <SF name="checkmark.circle.fill" size={20} color={T.brand} />
              ) : (
                <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: T.brandTinted }}>
                  <Text style={[ty.caption2Em, { color: T.brand }]}>{closed ? tr('Запрос') : tr('Открыть')}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
