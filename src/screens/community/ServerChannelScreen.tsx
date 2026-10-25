// Канал: шапка с главным действием, лента публикаций (статьи и голосовые) с реакциями.
// Автор публикует, разбирает заявки и меняет настройки в нижних листах. Экран владеет
// данными и сетью, внешний вид — у компонентов.
import { useAuth } from '@clerk/clerk-expo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';
import { Button } from '../../components/Button';
import { ChannelGate } from '../../components/ChannelGate';
import { ChannelHero, ChannelRole } from '../../components/ChannelHero';
import { ChannelPostCard } from '../../components/ChannelPostCard';
import { ChannelPostComposer, ChannelPostDraft } from '../../components/ChannelPostComposer';
import { ChannelRequestsSheet, ChannelRequestView } from '../../components/ChannelRequestsSheet';
import { ChannelMemberView, ChannelSettingsSheet, ChannelSettingsValues } from '../../components/ChannelSettingsSheet';
import { ChipRail } from '../../components/ChipRail';
import { ContentLoading } from '../../components/ContentLoading';
import { DetailScreen } from '../../components/DetailScreen';
import { HeaderIcon } from '../../components/HeaderIcon';
import { SectionHeader } from '../../components/SectionHeader';
import { Wrapper } from '../../components/Wrapper';
import {
  actChannelRequest, ChannelRequest, createChannelInvite, createChannelPost, deleteChannel, deleteChannelPost, fetchChannelMembers,
  fetchChannelRequests, fetchServerChannels, reactChannelPost, removeChannelMember, ServerChannel, ServerChannelPost, updateChannel, uploadFile,
} from '../../data/api';
import { hSuccess } from '../../lib/haptics';
import { CommunityStackParams } from '../../navigation/types';
import { useChannel } from '../../state/ChannelContext';
import { useChannelVoicePlayback } from '../../state/useChannelVoicePlayback';
import { useModeration } from '../../state/ModerationContext';
import { useRole } from '../../state/useRole';

type Props = NativeStackScreenProps<CommunityStackParams, 'ServerChannel'>;
type Filter = 'all' | 'article' | 'audio';

const REACTIONS = ['👍', '❤️', '🔥', '👏', '🙏'] as const;
const FILTERS: [Filter, string][] = [['all', 'Все'], ['article', 'Статьи'], ['audio', 'Голосовые']];

function requestView(r: ChannelRequest): ChannelRequestView {
  const name = r.profile?.fullName || r.userName || r.userEmail;
  return { userId: r.userId, name, detail: [r.userEmail !== name ? r.userEmail : null, r.profile?.phone, r.profile?.mbtiType ? `MBTI ${r.profile.mbtiType}` : null].filter(Boolean).join(' · ') };
}

export function ServerChannelScreen({ route, navigation }: Props) {
  const { getToken } = useAuth();
  const { email } = useRole();
  const { block } = useModeration();
  // Членство и список каналов — из ChannelContext: один источник правды для экрана и «Сообщества».
  const { reload: reloadChannels, memberships, join: joinChannel, markSeen } = useChannel();
  const voice = useChannelVoicePlayback();
  const id = route.params?.channelId ?? '';

  const [ch, setCh] = useState<ServerChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sheet, setSheet] = useState<'compose' | 'requests' | 'settings' | null>(null);
  const [requests, setRequests] = useState<ChannelRequest[]>([]);
  const [requestBusy, setRequestBusy] = useState<string | null>(null);
  const [members, setMembers] = useState<ChannelMemberView[]>([]);

  const state = memberships[id] ?? null;
  const owner = !!(ch?.createdBy && email && ch.createdBy.toLowerCase() === email.toLowerCase());
  const joined = state === 'subscribed' || state === 'approved';
  const role: ChannelRole = owner ? 'owner' : joined ? 'member' : 'guest';
  const unlocked = !!ch && (owner || ch.access === 'open' || joined);

  // Обновляет и экран, и контекст: изменения канала сразу видны в «Сообществе». С аккаунтом —
  // иначе сервер не отдаёт посты закрытого канала даже его участникам.
  const fetchChannel = useCallback(async () => {
    let token: string | null = null;
    try { token = await getToken(); } catch { token = null; }
    const channels = await fetchServerChannels(token);
    setCh(channels.find(c => c.id === id) ?? null);
    reloadChannels();
  }, [id, getToken, reloadChannels]);
  const load = useCallback(async () => { setLoading(true); try { await fetchChannel(); } finally { setLoading(false); } }, [fetchChannel]);
  useEffect(() => { void load(); }, [load]);
  // Канал открыт — его публикации прочитаны (отметка локальная, сервер её не хранит).
  useEffect(() => { markSeen(id); }, [id, markSeen]);

  const loadRequests = useCallback(async () => {
    const token = await getToken();
    setRequests(await fetchChannelRequests(token, id));
  }, [id, getToken]);
  useEffect(() => { if (owner && ch && ch.access !== 'open') void loadRequests(); }, [owner, ch?.id, ch?.access, loadRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => { setJoining(true); try { await joinChannel(id); } finally { setJoining(false); } };
  const react = async (postId: string, emoji: string) => {
    const res = await reactChannelPost(await getToken(), id, postId, emoji);
    if (res) setCh(c => c ? { ...c, posts: c.posts.map(p => p.id === postId ? { ...p, reactions: res.reactions, myReaction: res.myReaction } : p) } : c);
  };
  // UGC (App Store 1.2): пожаловаться на канал или скрыть его автора.
  const moderate = () => {
    if (!ch?.createdBy) return;
    Alert.alert('Канал', 'Пожаловаться на канал или скрыть его автора?', [
      { text: 'Пожаловаться', onPress: () => Alert.alert('Спасибо', 'Мы проверим этот канал.') },
      { text: 'Заблокировать автора', style: 'destructive', onPress: () => { block(ch.createdBy!); Alert.alert('Автор заблокирован', 'Его каналы и записи скрыты для вас.'); navigation.goBack(); } },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };
  const postActions = (p: ServerChannelPost) => Alert.alert(p.title || 'Публикация', undefined, [
    { text: 'Удалить публикацию', style: 'destructive', onPress: () => Alert.alert('Удалить публикацию?', 'Её нельзя будет восстановить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        const ok = await deleteChannelPost(await getToken(), id, p.id);
        if (ok) setCh(c => c ? { ...c, posts: c.posts.filter(x => x.id !== p.id), _count: c._count ? { ...c._count, posts: Math.max(0, (c._count.posts ?? 1) - 1) } : c._count } : c);
        else Alert.alert('Не удалось удалить', 'Проверьте подключение и попробуйте снова.');
      } },
    ]) },
    { text: 'Отмена', style: 'cancel' },
  ]);
  const publish = async (draft: ChannelPostDraft) => {
    const token = await getToken();
    let audioUrl = draft.audioUrl;
    if (draft.type === 'audio' && draft.audioUri) {
      const url = await uploadFile(token, draft.audioUri, `voice_${Date.now()}.m4a`, 'audio/m4a');
      if (!url) { Alert.alert('Не удалось загрузить аудио', 'Проверьте подключение.'); return false; }
      audioUrl = url;
    }
    const created = await createChannelPost(token, id, { type: draft.type, title: draft.title, body: draft.type === 'article' ? draft.body : undefined, audioUrl: draft.type === 'audio' ? audioUrl : undefined });
    if (!created) { Alert.alert('Не удалось опубликовать', 'Проверьте подключение и права.'); return false; }
    hSuccess(); setSheet(null); await fetchChannel();
    return true;
  };
  const decide = async (userId: string, action: 'approve' | 'reject') => {
    setRequestBusy(userId);
    try { await actChannelRequest(await getToken(), id, userId, action); await loadRequests(); if (action === 'approve') await fetchChannel(); }
    finally { setRequestBusy(null); }
  };
  const openSettings = async () => {
    setSheet('settings');
    const rows = await fetchChannelMembers(await getToken(), id);
    setMembers(rows.map(m => ({ userId: m.userId, name: m.userName || m.userEmail, email: m.userEmail })));
  };
  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее.'); return null; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (r.canceled || !r.assets?.[0]?.uri) return null;
    const url = await uploadFile(await getToken(), r.assets[0].uri, 'avatar.jpg', 'image/jpeg');
    if (!url) Alert.alert('Не удалось загрузить фото');
    return url;
  };
  const save = async (v: ChannelSettingsValues) => {
    const ok = await updateChannel(await getToken(), id, { name: v.name.trim(), bio: v.bio.trim(), avatarUrl: v.avatarUrl ?? undefined, handle: v.handle.trim() || undefined, access: v.access });
    if (!ok) { Alert.alert('Не удалось сохранить'); return false; }
    setSheet(null); await fetchChannel();
    return true;
  };
  const invite = async () => {
    const inv = await createChannelInvite(await getToken(), id);
    if (inv) Share.share({ message: `Присоединяйся к каналу «${ch?.name ?? ''}» в Divergents: ${inv.url}` });
    else Alert.alert('Не удалось создать ссылку');
  };
  const removeMember = (m: ChannelMemberView) => Alert.alert('Удалить участника?', m.name, [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: async () => { await removeChannelMember(await getToken(), id, m.userId); setMembers(list => list.filter(x => x.userId !== m.userId)); } },
  ]);
  // Необратимо — двойное подтверждение.
  const removeChannel = () => Alert.alert('Удалить канал?', 'Канал и все его публикации будут удалены безвозвратно.', [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить канал', style: 'destructive', onPress: () => Alert.alert('Точно удалить?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        const ok = await deleteChannel(await getToken(), id);
        if (ok) { hSuccess(); setSheet(null); reloadChannels(); navigation.goBack(); } else Alert.alert('Не удалось удалить канал');
      } },
    ]) },
  ]);

  const back = () => navigation.goBack();
  if (loading && !ch) return <DetailScreen backLabel="Каналы" onBack={back}><ContentLoading /></DetailScreen>;
  if (!ch) return <DetailScreen backLabel="Каналы" onBack={back}>
    <Wrapper padding={16} gap={12}>
      <ChannelGate kind="not-found" onAction={load} />
      <Button label="К списку каналов" variant="plain" onPress={back} />
    </Wrapper>
  </DetailScreen>;

  const posts = ch.posts;
  const visible = posts.filter(p => filter === 'all' || p.type === filter);
  const postCount = Math.max(ch._count?.posts ?? 0, posts.length);
  const filters = FILTERS.flatMap(([key, label]) => {
    const n = key === 'all' ? posts.length : posts.filter(p => p.type === key).length;
    return key !== 'all' && n === 0 ? [] : [{ key, label: `${label} · ${n}`, active: filter === key, onPress: () => setFilter(key) }];
  });

  return <DetailScreen backLabel="Каналы" onBack={back} onRefresh={fetchChannel}
    actions={!owner ? <HeaderIcon name="ellipsis" label="Пожаловаться или заблокировать" onPress={moderate} /> : undefined}>
    <Wrapper paddingHorizontal={16} paddingTop={8} gap={20} paddingBottom={32}>
      <ChannelHero name={ch.name} handle={ch.handle} bio={ch.bio} avatarUri={ch.avatarUrl} access={ch.access === 'open' ? 'open' : 'request'}
        memberCount={ch._count?.members} postCount={postCount} role={role} requested={state === 'requested'} busy={joining}
        pendingRequests={requests.length} onJoin={join} onCompose={() => setSheet('compose')}
        onRequests={() => { setSheet('requests'); void loadRequests(); }} onSettings={openSettings} />
      {!unlocked ? <ChannelGate kind={state === 'requested' ? 'requested' : 'locked'} postCount={postCount} />
        : posts.length === 0 ? <ChannelGate kind={owner ? 'empty-owner' : 'empty'} onAction={owner ? () => setSheet('compose') : undefined} />
        : <Wrapper gap={12}>
          <Wrapper marginHorizontal={-16}><SectionHeader title="Публикации" /></Wrapper>
          {filters.length > 2 ? <Wrapper marginHorizontal={-16}><ChipRail items={filters} itemRole="tab" /></Wrapper> : null}
          {visible.map(p => <ChannelPostCard key={p.id} post={p} reactionOptions={REACTIONS}
            expanded={!!expanded[p.id]} onToggleExpanded={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
            playing={voice.playingId === p.id} onPlay={() => voice.toggle(p.id, p.audioUrl)} onReact={emoji => react(p.id, emoji)}
            onMore={owner ? () => postActions(p) : undefined} />)}
        </Wrapper>}
    </Wrapper>
    <ChannelPostComposer visible={sheet === 'compose'} onClose={() => setSheet(null)} onPublish={publish} />
    <ChannelRequestsSheet visible={sheet === 'requests'} requests={requests.map(requestView)} busyId={requestBusy}
      onApprove={uid => decide(uid, 'approve')} onReject={uid => decide(uid, 'reject')} onClose={() => setSheet(null)} />
    <ChannelSettingsSheet visible={sheet === 'settings'} members={members} onClose={() => setSheet(null)}
      initial={{ name: ch.name, handle: ch.handle ?? '', bio: ch.bio ?? '', access: ch.access === 'open' ? 'open' : 'request', avatarUrl: ch.avatarUrl ?? null }}
      onPickAvatar={pickAvatar} onSave={save} onInvite={invite} onRemoveMember={removeMember} onDelete={removeChannel} />
  </DetailScreen>;
}
