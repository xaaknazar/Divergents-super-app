import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Share, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { ty, Segmented } from '../../components/ui';
import { BackNav } from '../../components/headers';
import { useRole } from '../../state/useRole';
import { useModeration } from '../../state/ModerationContext';
import { hSelect, hSuccess } from '../../lib/haptics';
import {
  fetchServerChannels, fetchMyChannelMemberships, joinChannel, fetchChannelRequests,
  actChannelRequest, createChannelPost, reactChannelPost, uploadFile, updateChannel, deleteChannel,
  deleteChannelPost, fetchChannelMembers, removeChannelMember, createChannelInvite, ServerChannel, ServerChannelPost, ChannelRequest, ChannelMemberRow,
} from '../../data/api';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ServerChannel'>;

const REACTIONS = ['👍', '❤️', '🔥', '👏', '🙏'];
function fmtTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
// Deterministic bar heights for a voice-message waveform (stable per post).
function waveHeights(seed: string, n = 22): number[] {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) { h = (h * 1103515245 + 12345) >>> 0; out.push(5 + (h % 15)); }
  return out;
}

export function ServerChannelScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { email } = useRole();
  const id = route.params.channelId;

  const [ch, setCh] = useState<ServerChannel | null>(null);
  const [state, setState] = useState<string | null>(null); // membership state
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [requests, setRequests] = useState<ChannelRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Feed controls: filter by post type and per-post "read more" expansion.
  const [postFilter, setPostFilter] = useState<'all' | 'article' | 'audio'>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Play channel voice posts through expo-av (not expo-video): remote m4a from
  // UploadThing plays reliably here and it shares the same audio session the
  // recorder uses, so it isn't left muted after a recording.
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false }).catch(() => {});
    return () => { soundRef.current?.unloadAsync().catch(() => {}); soundRef.current = null; };
  }, []);

  // Server-backed reactions: toggle on the backend, then patch the post in place
  // with the returned counts + the user's current reaction.
  const react = async (postId: string, emoji: string) => {
    const token = await getToken();
    const res = await reactChannelPost(token, id, postId, emoji);
    if (res) setCh((c) => c ? { ...c, posts: c.posts.map((p) => p.id === postId ? { ...p, reactions: res.reactions, myReaction: res.myReaction } : p) } : c);
  };

  const owner = !!(ch?.createdBy && email && ch.createdBy.toLowerCase() === email.toLowerCase());
  const { block } = useModeration();
  // UGC moderation (App Store 1.2): report the channel or block its author.
  const moderateChannel = () => {
    if (!ch?.createdBy) return;
    Alert.alert('Канал', 'Пожаловаться на канал или скрыть его автора?', [
      { text: 'Пожаловаться', onPress: () => Alert.alert('Спасибо', 'Мы проверим этот канал.') },
      { text: 'Заблокировать автора', style: 'destructive', onPress: () => { block(ch.createdBy!); Alert.alert('Автор заблокирован', 'Его каналы и записи скрыты для вас.'); navigation.goBack(); } },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [channels, mem] = await Promise.all([fetchServerChannels(), fetchMyChannelMemberships(token)]);
      const found = channels.find((c) => c.id === id) ?? null;
      setCh(found); setState(mem[id] ?? null);
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Pull-to-refresh: re-fetch without flipping the full-screen loading spinner.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = await getToken();
      const [channels, mem] = await Promise.all([fetchServerChannels(), fetchMyChannelMemberships(token)]);
      const found = channels.find((c) => c.id === id) ?? null;
      setCh(found); setState(mem[id] ?? null);
    } finally { setRefreshing(false); }
  }, [id]);

  const loadRequests = useCallback(async () => {
    const token = await getToken();
    setRequests(await fetchChannelRequests(token, id));
  }, [id]);
  useEffect(() => { if (owner && ch && ch.access !== 'open') loadRequests(); }, [owner, ch?.id]);

  const unlocked = !ch ? false : owner || ch.access === 'open' || state === 'subscribed' || state === 'approved';

  const join = async () => {
    if (!ch) return;
    setBusy(true);
    try { const token = await getToken(); const s = await joinChannel(token, id); if (s) setState(s); } finally { setBusy(false); }
  };

  const confirmDeletePost = (p: ServerChannelPost) => {
    Alert.alert('Удалить публикацию?', p.title || 'Публикация', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        const token = await getToken();
        const ok = await deleteChannelPost(token, id, p.id);
        if (ok) setCh((c) => c ? { ...c, posts: c.posts.filter((x) => x.id !== p.id), _count: c._count ? { ...c._count, posts: Math.max(0, (c._count.posts ?? 1) - 1) } : c._count } : c);
        else Alert.alert('Не удалось удалить', 'Проверьте подключение и попробуйте снова.');
      } },
    ]);
  };

  const playPost = async (p: ServerChannelPost) => {
    if (!p.audioUrl) return;
    try {
      if (playingId === p.id) { await soundRef.current?.pauseAsync().catch(() => {}); setPlayingId(null); return; } // toggle off
      if (soundRef.current) { await soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null; }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      const { sound } = await Audio.Sound.createAsync({ uri: p.audioUrl }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(p.id);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) { setPlayingId(null); sound.unloadAsync().catch(() => {}); soundRef.current = null; }
      });
    } catch { setPlayingId(null); }
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: T.groupedBg }}><BackNav back="Каналы" onBack={() => navigation.goBack()} /><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View></View>;
  }
  if (!ch) {
    // Fresh channels can lag the public list — offer a retry + a way back instead
    // of a dead end (this is what the "new channel" push used to land on).
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back="Каналы" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 6 }}>
          <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            <SF name="tray" size={28} color={T.labelSecondary} />
          </View>
          <Text style={[ty.headline, { color: T.label }]}>Канал не найден</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>Возможно, он ещё публикуется или был удалён.</Text>
          <Pressable onPress={load} style={{ marginTop: 14, height: 44, paddingHorizontal: 22, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="arrow.clockwise" size={15} color="#fff" /><Text style={[ty.subheadEm, { color: '#fff' }]}>Обновить</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginTop: 6, padding: 8 }}>
            <Text style={[ty.subhead, { color: T.brandAccent }]}>К списку каналов</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const initial = (ch.name?.trim()?.[0] ?? 'K').toUpperCase();
  const accIcon = ch.access === 'open' ? 'globe' : 'lock.fill';
  const accLabel = ch.access === 'open' ? 'Открытый' : 'По запросу';

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Каналы" onBack={() => navigation.goBack()} trailing={!owner ? (
        <Pressable onPress={moderateChannel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Пожаловаться или заблокировать">
          <SF name="ellipsis" size={18} color={T.label} />
        </Pressable>
      ) : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brand} />}>
        {/* Gradient hero header */}
        <View style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 0.5, borderColor: T.cardBorder, shadowColor: T.brand, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
          <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
            <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.04)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {ch.avatarUrl ? (
                <Image source={{ uri: ch.avatarUrl }} style={{ width: 66, height: 66, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={{ width: 66, height: 66, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.title1, { color: '#fff' }]}>{initial}</Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[ty.title2, { color: '#fff', textShadowColor: 'rgba(0,0,0,0.22)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{ch.name}</Text>
                {ch.handle ? <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 1 }]} numberOfLines={1}>@{ch.handle}</Text> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                    <SF name={accIcon} size={10} color="#fff" /><Text style={[ty.caption2Em, { color: '#fff' }]}>{accLabel}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                    <SF name="person.2.fill" size={10} color="#fff" /><Text style={[ty.caption2Em, { color: '#fff' }]}>{ch._count?.members ?? 0}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                    <SF name="doc.text.fill" size={10} color="#fff" /><Text style={[ty.caption2Em, { color: '#fff' }]}>{ch._count?.posts ?? 0}</Text>
                  </View>
                </View>
              </View>
            </View>
            {ch.bio ? <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.95)', marginTop: 12 }]} numberOfLines={3}>{ch.bio}</Text> : null}
          </LinearGradient>

          {/* Actions on a solid surface for readable contrast */}
          <View style={{ backgroundColor: T.cardBg, padding: 14 }}>
            {owner ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => setPostOpen(true)} style={{ flex: 1, height: 46, borderRadius: 13, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                  <SF name="plus" size={15} color="#fff" /><Text style={[ty.subheadEm, { color: '#fff' }]}>Создать пост</Text>
                </Pressable>
                {ch.access !== 'open' ? (
                  <Pressable onPress={() => { setReqOpen(true); loadRequests(); }} style={{ height: 46, paddingHorizontal: 14, borderRadius: 13, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                    <SF name="person.2.fill" size={15} color={T.brand} /><Text style={[ty.subheadEm, { color: T.brand }]}>{requests.length ? requests.length : ''}</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setManageOpen(true)} style={{ height: 46, paddingHorizontal: 15, borderRadius: 13, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}>
                  <SF name="gearshape.fill" size={17} color={T.label} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={join} disabled={busy || state === 'requested'} style={{ height: 48, borderRadius: 14, backgroundColor: state === 'subscribed' || state === 'approved' ? T.fillSecondary : T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                {busy ? <ActivityIndicator color={state === 'subscribed' || state === 'approved' ? T.label : '#fff'} /> : (
                  <>
                    {state === 'subscribed' || state === 'approved' ? <SF name="checkmark.circle.fill" size={16} color={T.brand} /> : null}
                    <Text style={[ty.headline, { color: state === 'subscribed' || state === 'approved' ? T.label : '#fff' }]}>
                      {state === 'subscribed' || state === 'approved' ? 'Вы участник' : state === 'requested' ? 'Запрос отправлен' : ch.access === 'open' ? 'Вступить' : 'Запросить доступ'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Posts */}
        {!unlocked ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><SF name="lock.fill" size={26} color={T.labelSecondary} /></View>
            <Text style={[ty.headline, { color: T.label, marginTop: 12 }]}>{state === 'requested' ? 'Запрос на рассмотрении' : 'Доступ по запросу'}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6, textAlign: 'center' }]}>{state === 'requested' ? 'Владелец одобрит запрос, и публикации откроются.' : 'Отправьте запрос, чтобы видеть публикации.'}</Text>
          </View>
        ) : (
          <>
            {/* Section header + count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 20, paddingBottom: 12, paddingHorizontal: 4 }}>
              <Text style={[ty.title3, { color: T.label }]}>Публикации</Text>
              {ch.posts.length > 0 ? (
                <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.caption2Em, { color: T.labelSecondary }]}>{ch.posts.length}</Text>
                </View>
              ) : null}
            </View>

            {/* Content-type filter (only when there's more than one post) */}
            {ch.posts.length > 1 ? (
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginBottom: 14 }}>
                {([['all', 'Все'], ['article', 'Статьи'], ['audio', 'Голос']] as const).map(([k, label]) => {
                  const n = k === 'all' ? ch.posts.length : ch.posts.filter((p) => p.type === k).length;
                  if (k !== 'all' && n === 0) return null;
                  const on = postFilter === k;
                  return (
                    <Pressable key={k} onPress={() => { hSelect(); setPostFilter(k); }}
                      style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: on ? T.brand : T.fillSecondary, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={[ty.footnoteEm, { color: on ? '#fff' : T.labelSecondary }]}>{label}</Text>
                      <Text style={[ty.caption2Em, { color: on ? 'rgba(255,255,255,0.85)' : T.labelTertiary }]}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {ch.posts.length === 0 ? (
              owner ? (
                <View style={{ backgroundColor: T.cardBg, borderRadius: 20, borderWidth: 0.5, borderColor: T.cardBorder, padding: 24, alignItems: 'center' }}>
                  <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                    <SF name="square.and.pencil" size={26} color={T.brand} />
                  </View>
                  <Text style={[ty.headline, { color: T.label, marginTop: 14 }]}>Опубликуйте первый пост</Text>
                  <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6, textAlign: 'center' }]}>Поделитесь статьёй или голосовым сообщением — участники увидят его здесь.</Text>
                  <Pressable onPress={() => setPostOpen(true)} style={{ marginTop: 16, height: 46, paddingHorizontal: 22, borderRadius: 13, backgroundColor: T.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <SF name="plus" size={15} color="#fff" /><Text style={[ty.subheadEm, { color: '#fff' }]}>Создать пост</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 34 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><SF name="quote.bubble.fill" size={24} color={T.labelSecondary} /></View>
                  <Text style={[ty.headline, { color: T.label, marginTop: 12 }]}>Здесь пока тихо</Text>
                  <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6, textAlign: 'center' }]}>Автор ещё не публиковал. Загляните позже.</Text>
                </View>
              )
            ) : (
              ch.posts.filter((p) => postFilter === 'all' || p.type === postFilter).map((p) => {
                const isAudio = p.type === 'audio';
                const long = !isAudio && (p.body?.length ?? 0) > 260;
                const isOpen = !!expanded[p.id];
                const totalReactions = p.reactions ? Object.values(p.reactions).reduce((s, n) => s + (n || 0), 0) : 0;
                return (
                  <View key={p.id} style={{ backgroundColor: T.cardBg, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: T.cardBorder }}>
                    {/* Header: type badge + time (+ owner delete) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.brandTinted, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
                        <SF name={isAudio ? 'waveform' : 'doc.text.fill'} size={11} color={T.brand} />
                        <Text style={[ty.caption2Em, { color: T.brand }]}>{isAudio ? 'Голос' : 'Статья'}</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <SF name="clock.fill" size={10} color={T.labelTertiary} />
                      <Text style={[ty.caption2, { color: T.labelTertiary }]}>{fmtTime(p.createdAt)}</Text>
                      {owner ? (
                        <Pressable onPress={() => confirmDeletePost(p)} hitSlop={8} accessibilityLabel="Удалить публикацию" style={{ paddingLeft: 10 }}>
                          <SF name="trash.fill" size={13} color={T.labelTertiary} />
                        </Pressable>
                      ) : null}
                    </View>

                    {p.title ? <Text style={[ty.headline, { color: T.label, marginTop: 10 }]}>{p.title}</Text> : null}

                    {isAudio && p.audioUrl ? (
                      <Pressable onPress={() => playPost(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: T.fillSecondary, borderRadius: 14, padding: 10 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                          <SF name={playingId === p.id ? 'pause.fill' : 'play.fill'} size={18} color="#fff" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, overflow: 'hidden' }}>
                            {waveHeights(p.id).map((hh, i) => (
                              <View key={i} style={{ width: 3, height: hh, borderRadius: 2, backgroundColor: playingId === p.id ? T.brand : T.labelTertiary }} />
                            ))}
                          </View>
                          <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 3 }]} numberOfLines={1}>{playingId === p.id ? 'Играет…' : 'Голосовое сообщение'}</Text>
                        </View>
                      </Pressable>
                    ) : p.body ? (
                      <>
                        <Text style={[ty.body, { color: T.labelSecondary, marginTop: 8 }]} numberOfLines={long && !isOpen ? 6 : undefined}>{p.body}</Text>
                        {long ? (
                          <Pressable onPress={() => setExpanded((e) => ({ ...e, [p.id]: !isOpen }))} hitSlop={6} style={{ marginTop: 6 }}>
                            <Text style={[ty.subheadEm, { color: T.brand }]}>{isOpen ? 'Свернуть' : 'Читать далее'}</Text>
                          </Pressable>
                        ) : null}
                      </>
                    ) : null}

                    {/* Reactions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                      {REACTIONS.map((e) => {
                        const on = p.myReaction === e;
                        const count = p.reactions?.[e] ?? 0;
                        return (
                          <Pressable key={e} onPress={() => react(p.id, e)} hitSlop={4}
                            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: on ? T.brandTinted : T.fillSecondary, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Text style={{ fontSize: 14 }}>{e}</Text>
                            {count > 0 ? <Text style={[ty.caption2Em, { color: on ? T.brand : T.labelSecondary }]}>{count}</Text> : null}
                          </Pressable>
                        );
                      })}
                      {totalReactions > 0 ? (
                        <>
                          <View style={{ flex: 1 }} />
                          <Text style={[ty.caption2, { color: T.labelTertiary }]}>{totalReactions}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Create post modal (owner) */}
      <Modal visible={postOpen} animationType="slide" transparent onRequestClose={() => setPostOpen(false)}>
        <CreatePost channelId={id} onClose={() => setPostOpen(false)} onDone={() => { setPostOpen(false); load(); }} />
      </Modal>

      {/* Manage modal (owner) */}
      <Modal visible={manageOpen} animationType="slide" transparent onRequestClose={() => setManageOpen(false)}>
        <ManageChannel
          channel={ch}
          onClose={() => setManageOpen(false)}
          onSaved={() => { setManageOpen(false); load(); }}
          onDeleted={() => { setManageOpen(false); navigation.goBack(); }}
        />
      </Modal>

      {/* Requests modal (owner) */}
      <Modal visible={reqOpen} animationType="slide" transparent onRequestClose={() => setReqOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setReqOpen(false)} />
        <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16, maxHeight: '75%' }}>
          <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
          <Text style={[ty.title3, { color: T.label, paddingHorizontal: 20, paddingBottom: 10 }]}>Запросы на вступление</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            {requests.length === 0 ? <Text style={[ty.subhead, { color: T.labelTertiary, paddingHorizontal: 4, paddingVertical: 10 }]}>Новых запросов нет.</Text> : requests.map((r) => (
              <View key={r.id} style={{ backgroundColor: T.cardBg, borderRadius: 14, padding: 12, marginBottom: 10 }}>
                <Text style={[ty.subheadEm, { color: T.label }]}>{r.profile?.fullName || r.userName || r.userEmail}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]}>{r.userEmail}{r.profile?.phone ? ` · ${r.profile.phone}` : ''}{r.profile?.mbtiType ? ` · MBTI ${r.profile.mbtiType}` : ''}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable onPress={async () => { const tk = await getToken(); await actChannelRequest(tk, id, r.userId, 'approve'); loadRequests(); load(); }} style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.footnoteEm, { color: '#fff' }]}>Принять</Text></Pressable>
                  <Pressable onPress={async () => { const tk = await getToken(); await actChannelRequest(tk, id, r.userId, 'reject'); loadRequests(); }} style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.footnoteEm, { color: T.label }]}>Отклонить</Text></Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function CreatePost({ channelId, onClose, onDone }: { channelId: string; onClose: () => void; onDone: () => void }) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [type, setType] = useState<'article' | 'audio'>('article');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const recRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const recTimer = useRef<any>(null);
  const ok = title.trim().length > 1 && (type === 'article' ? body.trim().length > 0 : (!!recordedUri || audioUrl.trim().length > 5));

  const startRec = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа к микрофону', 'Разрешите запись в настройках.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const r = new Audio.Recording();
      await r.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await r.startAsync();
      recRef.current = r; setRecording(true); setRecSec(0); setRecordedUri(null);
      recTimer.current = setInterval(() => setRecSec((x) => x + 1), 1000);
    } catch { Alert.alert('Ошибка записи', 'Не удалось начать запись.'); }
  };
  const stopRec = async () => {
    clearInterval(recTimer.current); setRecording(false);
    try { const r = recRef.current; if (r) { await r.stopAndUnloadAsync(); setRecordedUri(r.getURI() ?? null); } } catch {}
    recRef.current = null;
    // Reset the iOS audio session OUT of record mode, otherwise playback of the
    // recorded voice (and lesson videos) stays silent. playsInSilentModeIOS lets
    // it sound even with the mute switch on.
    try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }); } catch {}
  };
  const inp = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body } as any;
  const submit = async () => {
    if (!ok) return; setBusy(true);
    try {
      const token = await getToken();
      let finalAudio = audioUrl.trim();
      if (type === 'audio' && recordedUri) {
        const url = await uploadFile(token, recordedUri, `voice_${Date.now()}.m4a`, 'audio/m4a');
        if (!url) { Alert.alert('Не удалось загрузить аудио', 'Проверьте подключение.'); setBusy(false); return; }
        finalAudio = url;
      }
      const r = await createChannelPost(token, channelId, { type, title: title.trim(), body: type === 'article' ? body.trim() : undefined, audioUrl: type === 'audio' ? finalAudio : undefined });
      if (r) onDone(); else Alert.alert('Не удалось', 'Проверьте подключение и права.');
    } finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 16 }}>
        <Text style={[ty.title3, { color: T.label, marginBottom: 12 }]}>Новый пост</Text>
        <View style={{ flexDirection: 'row', backgroundColor: T.fillSecondary, borderRadius: 12, padding: 4, marginBottom: 12 }}>
          {(['article', 'audio'] as const).map((k) => (
            <Pressable key={k} onPress={() => setType(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: type === k ? T.cardBg : 'transparent' }}>
              <Text style={[ty.footnoteEm, { color: type === k ? T.brand : T.labelSecondary }]}>{k === 'article' ? 'Статья' : 'Аудио'}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={title} onChangeText={setTitle} placeholder="Заголовок" placeholderTextColor={T.labelTertiary} style={[inp, { marginBottom: 10 }]} />
        {type === 'article'
          ? <TextInput value={body} onChangeText={setBody} placeholder="Текст" placeholderTextColor={T.labelTertiary} multiline style={[inp, { minHeight: 110, textAlignVertical: 'top' }]} />
          : (
            <View>
              <Pressable onPress={recording ? stopRec : startRec} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: recording ? '#EF4444' : T.brandTinted, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
                <SF name={recording ? 'pause.fill' : 'waveform'} size={18} color={recording ? '#fff' : T.brand} />
                <Text style={[ty.subheadEm, { color: recording ? '#fff' : T.brand }]}>{recording ? `Остановить · ${recSec}s` : recordedUri ? 'Записать заново' : 'Записать голос'}</Text>
              </Pressable>
              {recordedUri ? <Text style={[ty.caption1, { color: T.green, marginTop: 6 }]}>Голос записан ✓</Text> : null}
              <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 10, marginBottom: 4 }]}>или вставьте ссылку:</Text>
              <TextInput value={audioUrl} onChangeText={setAudioUrl} placeholder="Ссылка на аудио (mp3/m4a)" placeholderTextColor={T.labelTertiary} autoCapitalize="none" style={inp} />
            </View>
          )}
        <Pressable onPress={submit} disabled={!ok || busy} style={{ marginTop: 14, height: 48, borderRadius: 14, backgroundColor: ok ? T.brand : T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ty.headline, { color: ok ? '#fff' : T.labelTertiary }]}>Опубликовать</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function ManageChannel({ channel, onClose, onSaved, onDeleted }: { channel: ServerChannel; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [name, setName] = useState(channel.name);
  const [handle, setHandle] = useState(channel.handle ?? '');
  const [bio, setBio] = useState(channel.bio ?? '');
  const [access, setAccess] = useState<'open' | 'request'>(channel.access === 'open' ? 'open' : 'request');
  const [avatar, setAvatar] = useState<string | null>(channel.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [avBusy, setAvBusy] = useState(false);
  const [members, setMembers] = useState<ChannelMemberRow[]>([]);

  useEffect(() => { (async () => { const t = await getToken(); setMembers(await fetchChannelMembers(t, channel.id)); })(); }, []);

  const inp = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body } as any;
  const sectionLabel = { ...ty.footnote, color: T.labelSecondary, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' as const, letterSpacing: 0.4 };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    setAvBusy(true);
    try { const t = await getToken(); const url = await uploadFile(t, r.assets[0].uri, 'avatar.jpg', 'image/jpeg'); if (url) setAvatar(url); else Alert.alert('Не удалось загрузить фото'); }
    finally { setAvBusy(false); }
  };
  const save = async () => {
    setBusy(true);
    try { const t = await getToken(); const ok = await updateChannel(t, channel.id, { name: name.trim(), bio: bio.trim(), avatarUrl: avatar ?? undefined, handle: handle.trim() || undefined, access }); if (ok) onSaved(); else Alert.alert('Не удалось сохранить'); }
    finally { setBusy(false); }
  };
  const invite = async () => {
    const t = await getToken(); const inv = await createChannelInvite(t, channel.id);
    if (inv) Share.share({ message: `Присоединяйся к каналу «${name}» в Divergents: ${inv.url}` });
    else Alert.alert('Не удалось создать ссылку');
  };
  const remove = async (uid: string, label: string) => {
    Alert.alert('Удалить участника', label, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => { const t = await getToken(); await removeChannelMember(t, channel.id, uid); setMembers((m) => m.filter((x) => x.userId !== uid)); } },
    ]);
  };
  // Destructive + irreversible → double confirmation.
  const del = () => {
    Alert.alert('Удалить канал?', 'Канал и все его публикации будут удалены безвозвратно.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить канал', style: 'destructive', onPress: () => {
        Alert.alert('Точно удалить?', 'Это действие нельзя отменить.', [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Удалить', style: 'destructive', onPress: async () => {
            setBusy(true);
            try { const t = await getToken(); const ok = await deleteChannel(t, channel.id); if (ok) { hSuccess(); onDeleted(); } else Alert.alert('Не удалось удалить канал'); }
            finally { setBusy(false); }
          } },
        ]);
      } },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16, maxHeight: '90%' }}>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[ty.title3, { color: T.label, marginBottom: 14 }]}>Настройки канала</Text>

          <Pressable onPress={pickAvatar} style={{ alignSelf: 'center', marginBottom: 16 }}>
            {avatar ? <Image source={{ uri: avatar }} style={{ width: 88, height: 88, borderRadius: 24 }} contentFit="cover" />
              : <View style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><SF name="photo" size={26} color={T.labelSecondary} /></View>}
            <Text style={[ty.caption1, { color: T.brand, textAlign: 'center', marginTop: 6 }]}>{avBusy ? 'Загрузка…' : 'Изменить фото'}</Text>
          </Pressable>

          <Text style={sectionLabel}>Название</Text>
          <TextInput value={name} onChangeText={setName} style={[inp, { marginBottom: 14 }]} />

          <Text style={sectionLabel}>Имя (@handle)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardBg, borderRadius: 12, paddingLeft: 14, marginBottom: 14 }}>
            <Text style={[ty.body, { color: T.labelTertiary }]}>@</Text>
            <TextInput value={handle} onChangeText={setHandle} autoCapitalize="none" placeholder="channel" placeholderTextColor={T.labelTertiary} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 6, color: T.label, ...ty.body }} />
          </View>

          <Text style={sectionLabel}>Описание</Text>
          <TextInput value={bio} onChangeText={setBio} multiline placeholder="О чём этот канал" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 80, textAlignVertical: 'top', marginBottom: 14 }]} />

          <Text style={sectionLabel}>Приватность</Text>
          <Segmented items={['Открытый', 'По запросу']} value={access === 'open' ? 0 : 1} onChange={(i) => setAccess(i === 0 ? 'open' : 'request')} leadingIcons={['globe', 'lock.fill']} />
          <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 6, marginLeft: 4 }]}>
            {access === 'open' ? 'Любой может вступить и читать публикации.' : 'Новые участники вступают по одобрению владельца.'}
          </Text>

          <Pressable onPress={invite} style={{ marginTop: 16, height: 46, borderRadius: 12, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="square.and.arrow.up" size={16} color={T.brand} />
            <Text style={[ty.subheadEm, { color: T.brand }]}>Пригласительная ссылка</Text>
          </Pressable>

          <Text style={[sectionLabel, { marginTop: 20 }]}>Участники · {members.length}</Text>
          {members.length === 0 ? <Text style={[ty.subhead, { color: T.labelTertiary, marginLeft: 4 }]}>Пока нет участников.</Text> : members.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.cardBg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{m.userName || m.userEmail}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{m.userEmail}</Text>
              </View>
              <Pressable onPress={() => remove(m.userId, m.userName || m.userEmail)} hitSlop={8}><SF name="xmark.circle.fill" size={20} color={T.red} /></Pressable>
            </View>
          ))}

          <Pressable onPress={save} disabled={busy} style={{ marginTop: 20, height: 50, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ty.headline, { color: '#fff' }]}>Сохранить</Text>}
          </Pressable>

          {/* Danger zone */}
          <Text style={[sectionLabel, { marginTop: 26, color: T.red }]}>Опасная зона</Text>
          <Pressable onPress={del} disabled={busy} style={{ height: 50, borderRadius: 14, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="trash.fill" size={16} color="#fff" />
            <Text style={[ty.headline, { color: '#fff' }]}>Удалить канал</Text>
          </Pressable>
          <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 8, marginLeft: 4 }]}>Канал и все публикации будут удалены безвозвратно.</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
