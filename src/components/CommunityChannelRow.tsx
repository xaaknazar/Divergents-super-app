// Карточка канала (в макете — ChannelCard). `plain` — обычная белая карточка (список
// каналов); `cover` — на главной «Сообщества»: сверху полоса 72 с картинкой канала и
// лёгким затемнением снизу, аватар 56 наезжает на неё на 26 с белой обводкой 3.
// Без картинки у канала `cover` честно сводится к `plain`.
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { Channel } from '../data/channel';
import { CommunityStackParams } from '../navigation/types';
import { useChannel } from '../state/ChannelContext';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { shadow } from '../theme/tokens';
import { SF } from './SFIcon';
import { TappableSurface } from './TappableSurface';
import { Wrapper } from './Wrapper';
type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];

export function CommunityChannelRow({ channel, navigation, variant = 'plain' }: { channel: Channel; navigation: Nav; variant?: 'plain' | 'cover' }) {
  const { T, ty } = useTheme();
  const { isJoined, unread, postsByChannel } = useChannel();
  const joined = isJoined(channel.id);
  const count = unread(channel.id);
  const posts = postsByChannel(channel.id);
  const last = posts[0];
  const closed = channel.access === 'request';
  const initial = (channel.name?.trim()?.[0] ?? 'K').toUpperCase();
  const cover = variant === 'cover' && !!channel.avatar;
  // Second line: latest post for subscribers, otherwise the channel bio.
  const secondary = joined && last ? last.title : (channel.bio?.trim() || '');
  return (
    <Wrapper marginHorizontal={16} marginBottom={12}>
      <TappableSurface onPress={() => navigation.navigate('ServerChannel', { channelId: channel.id })}
        accessibilityLabel={`${tr('Канал')} ${channel.name}`}>
        {cover ? <View style={styles.banner}>
          <Image source={{ uri: channel.avatar }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: '35%' }} cachePolicy="memory-disk" />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
        </View> : null}
        <View style={[styles.row, cover ? styles.rowCover : null]}>
          <View style={cover ? [styles.avatarLift, shadow({ color: '#101D2C', opacity: 0.18, radius: 6, y: 4, elevation: 3 })] : null}>
            <View style={[styles.avatarFrame, cover ? { borderColor: T.cardBg, borderWidth: 3 } : null]}>
              {channel.avatar ? (
                <Image source={{ uri: channel.avatar }} style={[styles.avatar, { backgroundColor: T.brandTinted }]} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, styles.center]}>
                  <Text style={[ty.title3, { color: '#fff' }]}>{initial}</Text>
                </LinearGradient>
              )}
            </View>
            {closed ? (
              <View style={[styles.lock, { backgroundColor: T.cardBg }]}>
                <View style={[styles.lockInner, { backgroundColor: T.labelTertiary }]}>
                  <SF name="lock.fill" size={9} color="#fff" />
                </View>
              </View>
            ) : null}
          </View>
          <View style={[styles.text, cover ? styles.textCover : null]}>
            <View style={styles.titleRow}>
              <Text style={[ty.headline, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{channel.name}</Text>
              {channel.verified ? <SF name="checkmark.seal.fill" size={16} color={T.sky} /> : null}
            </View>
            {secondary ? (
              <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{secondary}</Text>
            ) : null}
            <View style={styles.meta}>
              <SF name="doc.text.fill" size={10} color={T.labelTertiary} />
              <Text style={[ty.caption2, { color: T.labelTertiary }]} numberOfLines={1}>
                {posts.length}{closed ? ` · ${tr('Закрытый')}` : ` · ${tr('Открытый')}`}
              </Text>
            </View>
          </View>
          {joined && count > 0 ? (
            <View style={[styles.count, { backgroundColor: T.brand }]}>
              <Text style={[ty.caption2Em, { color: '#fff' }]}>{count}</Text>
            </View>
          ) : joined ? (
            <SF name="checkmark.circle.fill" size={20} color={T.brandText} />
          ) : (
            <View style={[styles.open, { backgroundColor: T.brandTinted }]}>
              <Text style={[ty.caption2Em, { color: T.brandText }]}>{closed ? tr('Запрос') : tr('Открыть')}</Text>
            </View>
          )}
        </View>
      </TappableSurface>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  banner: { height: 72, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  rowCover: { alignItems: 'flex-end', gap: 12, paddingTop: 0 },
  avatarLift: { marginTop: -26, borderRadius: 21 },
  avatarFrame: { borderRadius: 21, borderCurve: 'continuous', overflow: 'hidden' },
  avatar: { width: 56, height: 56, borderRadius: 18, borderCurve: 'continuous' },
  center: { alignItems: 'center', justifyContent: 'center' },
  lock: { position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  lockInner: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  textCover: { paddingTop: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  open: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
});
