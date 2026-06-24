import React, { useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF, SFName } from '../../components/SFIcon';
import { Capsule, ty } from '../../components/ui';
import { BackNav } from '../../components/headers';
import { channelById, postsByChannel, ChannelPost } from '../../data/channel';
import { useChannel } from '../../state/ChannelContext';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'Channel'>;

export function ChannelScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const channel = channelById(route.params.channelId);
  const { isJoined, isRequested, isApproved, isPaid, join, leave, request, approve, pay, markSeen } = useChannel();

  useEffect(() => { if (channel) markSeen(channel.id); }, [channel?.id]);

  if (!channel) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back="Каналы" onBack={() => navigation.goBack()} />
        <View style={{ padding: 30, alignItems: 'center' }}><Text style={[ty.subhead, { color: T.labelSecondary }]}>Канал не найден</Text></View>
      </View>
    );
  }

  const joined = isJoined(channel.id);
  const requested = isRequested(channel.id);
  const approved = isApproved(channel.id);
  const paid = isPaid(channel.id);
  const priceLabel = channel.price ? `${channel.price.toLocaleString('ru-RU')} ₸` : '';

  const unlocked = channel.access === 'open' ? true : channel.access === 'paid' ? paid : joined;
  const locked = !unlocked;
  const subs = channel.baseSubscribers + (joined || paid ? 1 : 0);
  const posts = postsByChannel(channel.id);

  const payFlow = () => Alert.alert(
    'Оплата доступа',
    `Канал «${channel.name}» — ${priceLabel}.\nОплата производится через менеджера Divergents / платёжную систему. После подтверждения оплаты канал откроется.`,
    [{ text: 'Отмена', style: 'cancel' }, { text: 'Я оплатил(а)', onPress: () => pay(channel.id) }],
  );

  // primary button by access + state
  let btnLabel = 'Вступить в группу'; let btnIcon: SFName = 'plus'; let btnAction: () => void = () => join(channel.id); let btnMuted = false; let btnDisabled = false;
  if (channel.access === 'open') {
    if (joined) { btnLabel = 'Вы подписаны'; btnIcon = 'checkmark'; btnAction = () => leave(channel.id); btnMuted = true; }
  } else if (channel.access === 'request') {
    if (joined) { btnLabel = 'Вы подписаны'; btnIcon = 'checkmark'; btnAction = () => leave(channel.id); btnMuted = true; }
    else if (requested) { btnLabel = 'Запрос на рассмотрении'; btnIcon = 'clock'; btnMuted = true; btnDisabled = true; btnAction = () => {}; }
    else { btnLabel = 'Запросить доступ'; btnIcon = 'lock.fill'; btnAction = () => request(channel.id); }
  } else { // paid
    if (paid) { btnLabel = 'Доступ оплачен'; btnIcon = 'checkmark.seal.fill'; btnMuted = true; btnDisabled = true; btnAction = () => {}; }
    else if (approved) { btnLabel = `Оплатить ${priceLabel}`; btnIcon = 'creditcard.fill'; btnAction = payFlow; }
    else if (requested) { btnLabel = 'Запрос на рассмотрении'; btnIcon = 'clock'; btnMuted = true; btnAction = () => approve(channel.id); }
    else { btnLabel = 'Запросить доступ'; btnIcon = 'lock.fill'; btnAction = () => request(channel.id); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Каналы" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {/* Header */}
        <View style={{ backgroundColor: T.cardBg, borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Image source={{ uri: channel.avatar }} style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: T.brandTinted }} contentFit="cover" cachePolicy="memory-disk" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{channel.name}</Text>
                {channel.verified ? <SF name="checkmark.seal.fill" size={15} color="#0EA5E9" /> : null}
              </View>
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>@{channel.handle}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <SF name="person.2.fill" size={12} color={T.labelTertiary} />
                <Text style={[ty.caption1, { color: T.labelTertiary }]}>{subs.toLocaleString('ru-RU')} подписчиков</Text>
                {channel.access === 'request' ? <Capsule bg={T.fillSecondary} color={T.labelSecondary}><SF name="lock.fill" size={9} color={T.labelSecondary} />по запросу</Capsule> : null}
                {channel.access === 'paid' ? <Capsule bg={T.brandTinted} color={T.brand}><SF name="creditcard.fill" size={9} color={T.brand} />{priceLabel}</Capsule> : null}
              </View>
            </View>
          </View>
          <Text style={[ty.subhead, { color: T.label, marginTop: 12 }]}>{channel.bio}</Text>
          <Pressable onPress={btnAction} disabled={btnDisabled} style={{ marginTop: 14, height: 46, borderRadius: 14, backgroundColor: btnMuted ? T.fillSecondary : T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name={btnIcon} size={16} color={btnMuted ? T.label : '#fff'} />
            <Text style={[ty.headline, { color: btnMuted ? T.label : '#fff' }]}>{btnLabel}</Text>
          </Pressable>
        </View>

        {locked ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={channel.access === 'paid' && approved ? 'creditcard.fill' : 'lock.fill'} size={28} color={T.labelSecondary} />
            </View>
            <Text style={[ty.headline, { color: T.label, marginTop: 14 }]}>
              {channel.access === 'paid'
                ? (approved ? 'Запрос одобрен' : requested ? 'Запрос на рассмотрении' : 'Платный закрытый канал')
                : (requested ? 'Запрос на рассмотрении' : 'Доступ по запросу')}
            </Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6, textAlign: 'center' }]}>
              {channel.access === 'paid'
                ? (approved ? `Оплатите доступ (${priceLabel}), чтобы открыть публикации канала.` : requested ? 'Модератор рассмотрит запрос. После одобрения откроется оплата.' : `Сначала отправьте запрос. После одобрения — оплата ${priceLabel}.`)
                : (requested ? 'Модератор рассмотрит ваш запрос и откроет доступ к публикациям.' : 'Это закрытый канал. Отправьте запрос, чтобы видеть публикации.')}
            </Text>
            {channel.access === 'paid' && requested && !approved ? (
              <Pressable onPress={() => approve(channel.id)} style={{ marginTop: 16, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 12, backgroundColor: T.fillSecondary }}>
                <Text style={[ty.footnoteEm, { color: T.brand }]}>Проверить статус запроса</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 4, paddingTop: 18, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }]}>Публикации</Text>
            {posts.map((p) => <PostCard key={p.id} post={p} onPress={() => navigation.navigate('ChannelPost', { postId: p.id })} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PostCard({ post, onPress }: { post: ChannelPost; onPress: () => void }) {
  const { T } = useTheme();
  const { isLiked } = useChannel();
  const audio = post.type === 'audio';
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: T.cardBg, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: T.cardBorder }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
          <SF name={audio ? 'play.fill' : 'doc.text.fill'} size={22} color={T.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Capsule bg={T.brandTinted} color={T.brand}><SF name={audio ? 'waveform' : 'doc.text.fill'} size={10} color={T.brand} />{audio ? 'Аудио' : 'Статья'}</Capsule>
            <Text style={[ty.caption2, { color: T.labelTertiary }]}>{post.date}</Text>
          </View>
          <Text style={[ty.subheadEm, { color: T.label, marginTop: 6 }]} numberOfLines={2}>{post.title}</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 3 }]} numberOfLines={2}>{post.excerpt}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <Meta icon={audio ? 'headphones' : 'eye.fill'} text={post.views} />
            <Meta icon="heart.fill" text={String(post.likes + (isLiked(post.id) ? 1 : 0))} />
            <Meta icon="book" text={audio ? (post.durationLabel ?? '') : `${post.readMins} мин`} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: SFName; text: string }) {
  const { T } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <SF name={icon} size={12} color={T.labelTertiary} />
      <Text style={[ty.caption2, { color: T.labelTertiary }]}>{text}</Text>
    </View>
  );
}
