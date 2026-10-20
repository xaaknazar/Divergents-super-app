import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useChannel } from '../state/ChannelContext';
import { tr } from '../state/LanguageContext';
import { Trip, ChallengeListItem, daysUntil, teamsNeed } from '../data/community';
import { Channel } from '../data/channel';
import { imgUrl } from '../data/api';
import * as pl from '../data/plural';
import { CommunityStackParams } from '../navigation/types';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { Wrapper } from './Wrapper';
type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
const HERO_TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } as const;

export function CommunityChannelRow({ channel, navigation }: { channel: Channel; navigation: Nav }) {
  const { T, ty } = useTheme();
  const { isJoined, unread, postsByChannel } = useChannel();
  const joined = isJoined(channel.id);
  const count = unread(channel.id);
  const posts = postsByChannel(channel.id);
  const last = posts[0];
  const closed = channel.access === 'request';
  const initial = (channel.name?.trim()?.[0] ?? 'K').toUpperCase();
  // Second line: latest post for subscribers, otherwise the channel bio.
  const secondary = joined && last ? last.title : (channel.bio?.trim() || '');
  return (
    <Pressable onPress={() => navigation.navigate('ServerChannel', { channelId: channel.id })}
      accessibilityRole="button" accessibilityLabel={`${tr('Канал')} ${channel.name}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.cardBg, borderRadius: 18, borderCurve: 'continuous', padding: 14, marginHorizontal: 16, marginBottom: 14, borderWidth: 0.5, borderColor: T.cardBorder, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2, opacity: pressed ? 0.9 : 1 })}>
      <View>
        {channel.avatar ? (
          <Image source={{ uri: channel.avatar }} style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: T.brandTinted }} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 56, height: 56, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[ty.title3, { color: '#fff' }]}>{initial}</Text>
          </LinearGradient>
        )}
        {closed ? (
          <View style={{ position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, borderCurve: 'continuous', backgroundColor: T.cardBg, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderCurve: 'continuous', backgroundColor: T.labelTertiary, alignItems: 'center', justifyContent: 'center' }}>
              <SF name="lock.fill" size={9} color="#fff" />
            </View>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[ty.headline, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{channel.name}</Text>
          {channel.verified ? <SF name="checkmark.seal.fill" size={14} color={T.sky} /> : null}
        </View>
        {secondary ? (
          <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{secondary}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
          <SF name="doc.text.fill" size={10} color={T.labelTertiary} />
          <Text style={[ty.caption2, { color: T.labelTertiary }]} numberOfLines={1}>
            {posts.length}{closed ? ` · ${tr('Закрытый')}` : ` · ${tr('Открытый')}`}
          </Text>
        </View>
      </View>
      {joined && count > 0 ? (
        <View style={{ minWidth: 22, height: 22, borderRadius: 11, borderCurve: 'continuous', paddingHorizontal: 6, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[ty.caption2Em, { color: '#fff' }]}>{count}</Text>
        </View>
      ) : joined ? (
        <SF name="checkmark.circle.fill" size={20} color={T.brand} />
      ) : (
        <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderCurve: 'continuous', backgroundColor: T.brandTinted }}>
          <Text style={[ty.caption2Em, { color: T.brand }]}>{closed ? tr('Запрос') : tr('Открыть')}</Text>
        </View>
      )}
    </Pressable>
  );
}
