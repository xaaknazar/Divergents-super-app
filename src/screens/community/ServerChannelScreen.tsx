import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer } from 'expo-video';
import { Audio } from 'expo-av';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { BackNav } from '../../components/headers';
import { useRole } from '../../state/useRole';
import {
  fetchServerChannels, fetchMyChannelMemberships, joinChannel, fetchChannelRequests,
  actChannelRequest, createChannelPost, uploadFile, updateChannel, fetchChannelMembers, removeChannelMember, createChannelInvite, ServerChannel, ServerChannelPost, ChannelRequest, ChannelMemberRow,
} from '../../data/api';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ServerChannel'>;

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

  const player = useVideoPlayer(null, (p) => { p.loop = false; });
  const [playingId, setPlayingId] = useState<string | null>(null);

  const owner = !!(ch?.createdBy && email && ch.createdBy.toLowerCase() === email.toLowerCase());

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

  const playPost = (p: ServerChannelPost) => {
    if (!p.audioUrl) return;
    try { player.replace(p.audioUrl); player.play(); setPlayingId(p.id); } catch {}
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: T.groupedBg }}><BackNav back="Каналы" onBack={() => navigation.goBack()} /><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View></View>;
  }
  if (!ch) {
    return <View style={{ flex: 1, backgroundColor: T.groupedBg }}><BackNav back="Каналы" onBack={() => navigation.goBack()} /><View style={{ padding: 30, alignItems: 'center' }}><Text style={[ty.subhead, { color: T.labelSecondary }]}>Канал не найден</Text></View></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Каналы" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {/* Header */}
        <View style={{ backgroundColor: T.cardBg, borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
          {ch.avatarUrl ? <Image source={{ uri: ch.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 18, marginBottom: 10 }} contentFit="cover" cachePolicy="memory-disk" /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{ch.name}</Text>
            {ch.access === 'request' ? <SF name="lock.fill" size={13} color={T.labelTertiary} /> : null}
            {ch.access === 'paid' ? <SF name="creditcard.fill" size={13} color={T.labelTertiary} /> : null}
          </View>
          {ch.handle ? <Text style={[ty.caption1, { color: T.labelSecondary }]}>@{ch.handle}</Text> : null}
          <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 3 }]}>{ch._count?.members ?? 0} участников · {ch._count?.posts ?? 0} публикаций{ch.access === 'paid' && ch.price ? ` · ${ch.price}` : ''}</Text>
          {ch.bio ? <Text style={[ty.subhead, { color: T.label, marginTop: 10 }]}>{ch.bio}</Text> : null}

          {owner ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setPostOpen(true)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                <SF name="plus" size={15} color="#fff" /><Text style={[ty.subheadEm, { color: '#fff' }]}>Создать пост</Text>
              </Pressable>
              {ch.access !== 'open' ? (
                <Pressable onPress={() => { setReqOpen(true); loadRequests(); }} style={{ height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                  <SF name="person.2.fill" size={15} color={T.label} /><Text style={[ty.subheadEm, { color: T.label }]}>Запросы{requests.length ? ` · ${requests.length}` : ''}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setManageOpen(true)} style={{ height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <SF name="gearshape.fill" size={16} color={T.label} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={join} disabled={busy || state === 'requested'} style={{ marginTop: 14, height: 46, borderRadius: 14, backgroundColor: state === 'subscribed' || state === 'approved' ? T.fillSecondary : T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <Text style={[ty.headline, { color: state === 'subscribed' || state === 'approved' ? T.label : '#fff' }]}>
                {state === 'subscribed' || state === 'approved' ? 'Вы участник' : state === 'requested' ? 'Запрос отправлен' : ch.access === 'open' ? 'Вступить' : 'Запросить доступ'}
              </Text>
            </Pressable>
          )}
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
            <Text style={[ty.footnote, { color: T.labelSecondary, paddingTop: 18, paddingBottom: 10, paddingHorizontal: 4, textTransform: 'uppercase' }]}>Публикации</Text>
            {ch.posts.length === 0 ? <Text style={[ty.subhead, { color: T.labelTertiary, paddingHorizontal: 4 }]}>Пока нет публикаций.</Text> : ch.posts.map((p) => (
              <View key={p.id} style={{ backgroundColor: T.cardBg, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: T.cardBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SF name={p.type === 'audio' ? 'waveform' : 'doc.text.fill'} size={14} color={T.brand} />
                  <Text style={[ty.subheadEm, { color: T.label, flex: 1 }]} numberOfLines={2}>{p.title}</Text>
                </View>
                {p.type === 'audio' && p.audioUrl ? (
                  <Pressable onPress={() => playPost(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: T.brandTinted, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' }}>
                    <SF name={playingId === p.id ? 'pause.fill' : 'play.fill'} size={16} color={T.brand} />
                    <Text style={[ty.footnoteEm, { color: T.brand }]}>{playingId === p.id ? 'Играет' : 'Слушать'}</Text>
                  </Pressable>
                ) : p.body ? <Text style={[ty.body, { color: T.label, marginTop: 8 }]}>{p.body}</Text> : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Create post modal (owner) */}
      <Modal visible={postOpen} animationType="slide" transparent onRequestClose={() => setPostOpen(false)}>
        <CreatePost channelId={id} onClose={() => setPostOpen(false)} onDone={() => { setPostOpen(false); load(); }} />
      </Modal>

      {/* Manage modal (owner) */}
      <Modal visible={manageOpen} animationType="slide" transparent onRequestClose={() => setManageOpen(false)}>
        <ManageChannel channel={ch} onClose={() => setManageOpen(false)} onSaved={() => { setManageOpen(false); load(); }} />
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

function ManageChannel({ channel, onClose, onSaved }: { channel: ServerChannel; onClose: () => void; onSaved: () => void }) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [name, setName] = useState(channel.name);
  const [bio, setBio] = useState(channel.bio ?? '');
  const [avatar, setAvatar] = useState<string | null>(channel.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [avBusy, setAvBusy] = useState(false);
  const [members, setMembers] = useState<ChannelMemberRow[]>([]);

  useEffect(() => { (async () => { const t = await getToken(); setMembers(await fetchChannelMembers(t, channel.id)); })(); }, []);

  const inp = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body } as any;

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
    try { const t = await getToken(); const ok = await updateChannel(t, channel.id, { name: name.trim(), bio: bio.trim(), avatarUrl: avatar ?? undefined }); if (ok) onSaved(); else Alert.alert('Не удалось сохранить'); }
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16, maxHeight: '88%' }}>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={[ty.title3, { color: T.label, marginBottom: 12 }]}>Настройки канала</Text>

          <Pressable onPress={pickAvatar} style={{ alignSelf: 'center', marginBottom: 14 }}>
            {avatar ? <Image source={{ uri: avatar }} style={{ width: 88, height: 88, borderRadius: 24 }} contentFit="cover" />
              : <View style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><SF name="photo" size={26} color={T.labelSecondary} /></View>}
            <Text style={[ty.caption1, { color: T.brand, textAlign: 'center', marginTop: 6 }]}>{avBusy ? 'Загрузка…' : 'Изменить фото'}</Text>
          </Pressable>

          <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>НАЗВАНИЕ</Text>
          <TextInput value={name} onChangeText={setName} style={[inp, { marginBottom: 12 }]} />
          <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>ОПИСАНИЕ</Text>
          <TextInput value={bio} onChangeText={setBio} multiline style={[inp, { minHeight: 80, textAlignVertical: 'top' }]} />

          <Pressable onPress={invite} style={{ marginTop: 14, height: 46, borderRadius: 12, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="square.and.arrow.up" size={16} color={T.brand} />
            <Text style={[ty.subheadEm, { color: T.brand }]}>Пригласительная ссылка</Text>
          </Pressable>

          <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 18, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' }]}>Участники · {members.length}</Text>
          {members.length === 0 ? <Text style={[ty.subhead, { color: T.labelTertiary, marginLeft: 4 }]}>Пока нет участников.</Text> : members.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.cardBg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{m.userName || m.userEmail}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{m.userEmail}</Text>
              </View>
              <Pressable onPress={() => remove(m.userId, m.userName || m.userEmail)} hitSlop={8}><SF name="xmark.circle.fill" size={20} color={T.red} /></Pressable>
            </View>
          ))}

          <Pressable onPress={save} disabled={busy} style={{ marginTop: 18, height: 50, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ty.headline, { color: '#fff' }]}>Сохранить</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
