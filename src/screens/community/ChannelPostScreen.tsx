import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, Share } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { BackNav } from '../../components/headers';
import { CHANNEL, getPost } from '../../data/channel';
import { useChannel } from '../../state/ChannelContext';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChannelPost'>;

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ChannelPostScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const post = getPost(route.params.postId);
  const { isLiked, toggleLike } = useChannel();

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back="Канал" onBack={() => navigation.goBack()} />
        <View style={{ padding: 30, alignItems: 'center' }}><Text style={[ty.subhead, { color: T.labelSecondary }]}>Пост не найден</Text></View>
      </View>
    );
  }

  const liked = isLiked(post.id);
  const likeCount = post.likes + (liked ? 1 : 0);
  const share = () => Share.share({ message: `${CHANNEL.name}: «${post.title}» — в приложении Divergents` });

  if (post.type === 'audio') return <AudioPost post={post} liked={liked} likeCount={likeCount} onLike={() => toggleLike(post.id)} onShare={share} onBack={() => navigation.goBack()} T={T} insets={insets} />;

  // Article
  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Канал" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {post.cover ? <Image source={{ uri: post.cover }} style={{ width: '100%', height: 200 }} contentFit="cover" /> : null}
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Image source={{ uri: CHANNEL.avatar }} style={{ width: 28, height: 28, borderRadius: 14 }} contentFit="cover" />
            <Text style={[ty.subheadEm, { color: T.label }]}>{CHANNEL.name}</Text>
            <SF name="checkmark.seal.fill" size={13} color="#0EA5E9" />
            <Text style={[ty.caption1, { color: T.labelTertiary }]}>· {post.date}</Text>
          </View>
          <Text style={[ty.title1, { color: T.label }]}>{post.title}</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 6 }]}>{post.readMins} мин чтения · {post.views} просмотров</Text>
          <View style={{ height: 1, backgroundColor: T.separator, marginVertical: 16 }} />
          {(post.body ?? []).map((p, i) => (
            <Text key={i} style={[ty.body, { color: T.label, marginBottom: 14, lineHeight: 24 }]}>{p}</Text>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <Pressable onPress={onLikeFactory(post.id, toggleLike)} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: liked ? T.brandTinted : T.fillSecondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          <SF name={liked ? 'heart.fill' : 'heart'} size={18} color={liked ? T.brand : T.label} />
          <Text style={[ty.headline, { color: liked ? T.brand : T.label }]}>{likeCount}</Text>
        </Pressable>
        <Pressable onPress={share} style={{ width: 56, height: 48, borderRadius: 14, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}>
          <SF name="square.and.arrow.up" size={18} color={T.label} />
        </Pressable>
      </View>
    </View>
  );
}

function onLikeFactory(id: string, toggle: (id: string) => void) { return () => toggle(id); }

function AudioPost({ post, liked, likeCount, onLike, onShare, onBack, T, insets }: any) {
  const player = useVideoPlayer(post.audioUrl ?? '', (p: any) => { p.loop = false; });
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
  const barW = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        setPlaying(!!player.playing);
        setPos(player.currentTime ?? 0);
        if (player.duration && isFinite(player.duration)) setDur(player.duration);
      } catch {}
    }, 300);
    return () => clearInterval(id);
  }, [player]);

  const toggle = () => { try { if (player.playing) player.pause(); else player.play(); } catch {} };
  const seekBy = (d: number) => { try { player.currentTime = Math.max(0, Math.min(dur || 1e9, (player.currentTime ?? 0) + d)); } catch {} };
  const seekTo = (x: number) => { if (!barW.current || !dur) return; try { player.currentTime = Math.max(0, Math.min(dur, (x / barW.current) * dur)); } catch {} };
  const cycleRate = () => { const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1; setRate(next); try { player.playbackRate = next; } catch {} };

  const pct = dur > 0 ? Math.min(1, pos / dur) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Канал" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={{ alignItems: 'center', paddingTop: 16, paddingHorizontal: 24 }}>
          <View style={{ width: 220, height: 220, borderRadius: 28, overflow: 'hidden', backgroundColor: T.brandTinted, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } }}>
            <Image source={{ uri: CHANNEL.avatar }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 }}>
            <SF name="waveform" size={15} color={T.brand} />
            <Text style={[ty.caption1, { color: T.brand }]}>АУДИО · {CHANNEL.name}</Text>
          </View>
          <Text style={[ty.title2, { color: T.label, textAlign: 'center', marginTop: 8 }]}>{post.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', marginTop: 6 }]}>{post.excerpt}</Text>
          <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 6 }]}>{post.date} · {post.views} прослушиваний</Text>
        </View>

        {/* Progress */}
        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <Pressable onLayout={(e) => { barW.current = e.nativeEvent.layout.width; }} onPress={(e) => seekTo(e.nativeEvent.locationX)} style={{ paddingVertical: 8 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: T.fillSecondary, overflow: 'hidden' }}>
              <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: T.brand }} />
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={[ty.caption2, { color: T.labelSecondary }]}>{fmt(pos)}</Text>
            <Text style={[ty.caption2, { color: T.labelSecondary }]}>{dur > 0 ? fmt(dur) : post.durationLabel}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 18 }}>
          <Pressable onPress={() => seekBy(-15)} hitSlop={8}><SF name="gobackward.15" size={32} color={T.label} /></Pressable>
          <Pressable onPress={toggle} style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', shadowColor: T.brand, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
            <SF name={playing ? 'pause.fill' : 'play.fill'} size={32} color="#fff" />
          </Pressable>
          <Pressable onPress={() => seekBy(15)} hitSlop={8}><SF name="goforward.15" size={32} color={T.label} /></Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 22 }}>
          <Pressable onPress={cycleRate} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: T.fillSecondary }}>
            <Text style={[ty.footnoteEm, { color: T.label }]}>{rate}×</Text>
          </Pressable>
          <Pressable onPress={onLike} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: liked ? T.brandTinted : T.fillSecondary, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <SF name={liked ? 'heart.fill' : 'heart'} size={16} color={liked ? T.brand : T.label} />
            <Text style={[ty.footnoteEm, { color: liked ? T.brand : T.label }]}>{likeCount}</Text>
          </Pressable>
          <Pressable onPress={onShare} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: T.fillSecondary }}>
            <SF name="square.and.arrow.up" size={16} color={T.label} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
