import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal } from 'react-native';
import { Audio } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useRole } from '../../state/useRole';
import { useModeration } from '../../state/ModerationContext';
import { useChannel } from '../../state/ChannelContext';
import { fetchServerChannels, fetchChannelRequests, actChannelRequest, reactChannelPost,
  deleteChannelPost, ServerChannel, ServerChannelPost, ChannelRequest } from '../../data/api';
import { CommunityStackParams } from '../../navigation/types';
import { ChannelDetailView } from '../../components/ChannelDetailView';
import { CreateChannelPostSheet } from '../../components/CreateChannelPostSheet';
import { ManageChannelSheet } from '../../components/ManageChannelSheet';
import { ChannelRequestsSheet } from '../../components/ChannelRequestsSheet';

type Props = NativeStackScreenProps<CommunityStackParams, 'ServerChannel'>;

export function ServerChannelScreen({ route, navigation }: Props) {
  const { getToken } = useAuth();
  const { email } = useRole();
  // Членство и список каналов берём из ChannelContext: он единственный источник
  // правды, иначе этот экран расходится со списком каналов и вкладкой «Сообщество».
  const { reload: reloadChannels, memberships, join: joinCtx, markSeen } = useChannel();
  const id = route.params?.channelId ?? '';

  const [ch, setCh] = useState<ServerChannel | null>(null);
  const state = memberships[id] ?? null; // membership state (server-authoritative)
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [requests, setRequests] = useState<ChannelRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Play channel voice posts through expo-av (not expo-video): remote m4a from
  // UploadThing plays reliably here and it shares the same audio session the
  // recorder uses, so it isn't left muted after a recording.
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  useEffect(() => {
    // staysActiveInBackground — голосовой пост доигрывает после сворачивания
    // приложения. Запись при этом выключена: с включённым `allowsRecordingIOS`
    // iOS переводит сессию в режим микрофона и режет громкость динамика.
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
    }).catch(() => {});
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

  // Обновляет и этот экран, и контекст — поэтому любое изменение канала
  // (переименование, аватар, новый пост, принятая заявка) сразу видно в списке
  // каналов и на карточках вкладки «Сообщество», а не после перезапуска.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const channels = await fetchServerChannels();
      setCh(channels.find((c) => c.id === id) ?? null);
      reloadChannels();
    } finally { setLoading(false); }
  }, [id, reloadChannels]);
  useEffect(() => { load(); }, [load]);

  // Pull-to-refresh: re-fetch without flipping the full-screen loading spinner.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const channels = await fetchServerChannels();
      setCh(channels.find((c) => c.id === id) ?? null);
      reloadChannels();
    } finally { setRefreshing(false); }
  }, [id, reloadChannels]);

  // Канал открыт — значит его публикации прочитаны. Сервер не хранит «последний
  // просмотренный пост», поэтому отметка локальная; здесь единственное место,
  // где она вообще записывается.
  useEffect(() => { markSeen(id); }, [id, markSeen]);

  const loadRequests = useCallback(async () => {
    const token = await getToken();
    setRequests(await fetchChannelRequests(token, id));
  }, [id]);
  useEffect(() => { if (owner && ch && ch.access !== 'open') loadRequests(); }, [owner, ch?.id]);

  const join = async () => {
    if (!ch) return;
    setBusy(true);
    try { await joinCtx(id); } finally { setBusy(false); }
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
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
      });
      const { sound } = await Audio.Sound.createAsync({ uri: p.audioUrl }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(p.id);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) { setPlayingId(null); sound.unloadAsync().catch(() => {}); soundRef.current = null; }
      });
    } catch { setPlayingId(null); }
  };

  return <>
    <ChannelDetailView channel={ch} loading={loading} refreshing={refreshing}
      membership={state} owner={owner} busy={busy} requestCount={requests.length}
      playingId={playingId} onBack={() => navigation.goBack()} onModerate={moderateChannel}
      onRefresh={onRefresh} onJoin={join} onCreatePost={() => setPostOpen(true)}
      onRequests={() => { setReqOpen(true); loadRequests(); }} onManage={() => setManageOpen(true)}
      onPlay={postId => { const post = ch?.posts.find(p => p.id === postId); if (post) playPost(post); }}
      onReact={react}
      onDeletePost={postId => { const post = ch?.posts.find(p => p.id === postId); if (post) confirmDeletePost(post); }} />
    <Modal visible={postOpen} animationType="slide" transparent onRequestClose={() => setPostOpen(false)}>
      {postOpen ? <CreateChannelPostSheet getToken={getToken} channelId={id} onClose={() => setPostOpen(false)} onDone={() => { setPostOpen(false); load(); }} /> : null}
    </Modal>
    <Modal visible={manageOpen} animationType="slide" transparent onRequestClose={() => setManageOpen(false)}>
      {manageOpen && ch ? <ManageChannelSheet getToken={getToken} channel={ch} onClose={() => setManageOpen(false)}
        onSaved={() => { setManageOpen(false); load(); }}
        onDeleted={() => { setManageOpen(false); reloadChannels(); navigation.goBack(); }} /> : null}
    </Modal>
    <Modal visible={reqOpen} animationType="slide" transparent onRequestClose={() => setReqOpen(false)}>
      <ChannelRequestsSheet requests={requests} onClose={() => setReqOpen(false)}
        onApprove={async userId => { const tk = await getToken(); await actChannelRequest(tk, id, userId, 'approve'); loadRequests(); load(); }}
        onReject={async userId => { const tk = await getToken(); await actChannelRequest(tk, id, userId, 'reject'); loadRequests(); }} />
    </Modal>
  </>;
}
