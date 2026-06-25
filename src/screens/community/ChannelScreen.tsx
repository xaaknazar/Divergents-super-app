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
import { useLang } from '../../state/LanguageContext';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'Channel'>;

export function ChannelScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const channel = channelById(route.params.channelId);
  const { isJoined, isRequested, isApproved, isPaid, join, leave, request, approve, pay, markSeen } = useChannel();
  const { t, lang } = useLang();

  useEffect(() => { if (channel) markSeen(channel.id); }, [channel?.id]);

  if (!channel) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back={t('sec_channels')} onBack={() => navigation.goBack()} />
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
    t('pay_flow_title'),
    lang === 'ru'
      ? `Канал «${channel.name}» — ${priceLabel}.\nОплата через менеджера Divergents / платёжную систему. После подтверждения канал откроется.`
      : `Channel “${channel.name}” — ${priceLabel}.\nPayment is handled via a Divergents manager / payment system. The channel opens after confirmation.`,
    [{ text: t('cancel'), style: 'cancel' }, { text: t('paid_iv_paid'), onPress: () => pay(channel.id) }],
  );

  // primary button by access + state
  let btnLabel = t('subscribe_group'); let btnIcon: SFName = 'plus'; let btnAction: () => void = () => join(channel.id); let btnMuted = false; let btnDisabled = false;
  if (channel.access === 'open') {
    if (joined) { btnLabel = t('subscribed'); btnIcon = 'checkmark'; btnAction = () => leave(channel.id); btnMuted = true; }
  } else if (channel.access === 'request') {
    if (joined) { btnLabel = t('subscribed'); btnIcon = 'checkmark'; btnAction = () => leave(channel.id); btnMuted = true; }
    else if (requested) { btnLabel = t('request_pending'); btnIcon = 'clock'; btnMuted = true; btnDisabled = true; btnAction = () => {}; }
    else { btnLabel = t('request_access'); btnIcon = 'lock.fill'; btnAction = () => request(channel.id); }
  } else { // paid
    if (paid) { btnLabel = t('access_paid'); btnIcon = 'checkmark.seal.fill'; btnMuted = true; btnDisabled = true; btnAction = () => {}; }
    else if (approved) { btnLabel = `${t('pay_access')} ${priceLabel}`; btnIcon = 'creditcard.fill'; btnAction = payFlow; }
    else if (requested) { btnLabel = t('request_pending'); btnIcon = 'clock'; btnMuted = true; btnAction = () => approve(channel.id); }
    else { btnLabel = t('request_access'); btnIcon = 'lock.fill'; btnAction = () => request(channel.id); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={t('sec_channels')} onBack={() => navigation.goBack()} />
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
                <Text style={[ty.caption1, { color: T.labelTertiary }]}>{subs.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')} {t('subscribers')}</Text>
                {channel.access === 'request' ? <Capsule bg={T.fillSecondary} color={T.labelSecondary}><SF name="lock.fill" size={9} color={T.labelSecondary} />{t('by_request')}</Capsule> : null}
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
                ? (approved ? t('request_approved') : requested ? t('request_pending') : t('paid_closed_channel'))
                : (requested ? t('request_pending') : t('access_by_request_title'))}
            </Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6, textAlign: 'center' }]}>
              {channel.access === 'paid'
                ? (approved ? `${priceLabel} — ${t('paid_pay_now')}` : requested ? t('paid_after_approve') : `${t('paid_first_request')} ${priceLabel}.`)
                : (requested ? t('locked_pending_body') : t('locked_request_body'))}
            </Text>
            {channel.access === 'paid' && requested && !approved ? (
              <Pressable onPress={() => approve(channel.id)} style={{ marginTop: 16, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 12, backgroundColor: T.fillSecondary }}>
                <Text style={[ty.footnoteEm, { color: T.brand }]}>{t('check_status')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 4, paddingTop: 18, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{t('publications')}</Text>
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
  const { t: tt } = useLang();
  const audio = post.type === 'audio';
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: T.cardBg, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: T.cardBorder }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
          <SF name={audio ? 'play.fill' : 'doc.text.fill'} size={22} color={T.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Capsule bg={T.brandTinted} color={T.brand}><SF name={audio ? 'waveform' : 'doc.text.fill'} size={10} color={T.brand} />{audio ? tt('audio') : tt('article')}</Capsule>
            <Text style={[ty.caption2, { color: T.labelTertiary }]}>{post.date}</Text>
          </View>
          <Text style={[ty.subheadEm, { color: T.label, marginTop: 6 }]} numberOfLines={2}>{post.title}</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 3 }]} numberOfLines={2}>{post.excerpt}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <Meta icon={audio ? 'headphones' : 'eye.fill'} text={post.views} />
            <Meta icon="heart.fill" text={String(post.likes + (isLiked(post.id) ? 1 : 0))} />
            <Meta icon="book" text={audio ? (post.durationLabel ?? '') : `${post.readMins} ${tt('min_read')}`} />
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
