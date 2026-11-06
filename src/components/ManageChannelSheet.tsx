import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { Segmented } from './Segmented';
import { hSuccess } from '../lib/haptics';
import { uploadFile, updateChannel, deleteChannel, fetchChannelMembers, removeChannelMember, createChannelInvite, ServerChannel, ChannelMemberRow } from '../data/api';
export function ManageChannelSheet({ channel, onClose, onSaved, onDeleted, getToken }: { getToken: () => Promise<string | null>; channel: ServerChannel; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(channel.name);
  const [handle, setHandle] = useState(channel.handle ?? '');
  const [bio, setBio] = useState(channel.bio ?? '');
  const [access, setAccess] = useState<'open' | 'request'>(channel.access === 'open' ? 'open' : 'request');
  const [avatar, setAvatar] = useState<string | null>(channel.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [avBusy, setAvBusy] = useState(false);
  const [members, setMembers] = useState<ChannelMemberRow[]>([]);

  useEffect(() => { (async () => { const t = await getToken(); setMembers(await fetchChannelMembers(t, channel.id)); })(); }, []);

  const inp = { backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous', paddingVertical: 12, paddingHorizontal: 16, color: T.label, ...ty.body } as any;
  const sectionLabel = { ...ty.footnote, color: T.labelSecondary, marginBottom: 6, marginLeft: 4 as const, letterSpacing: 0.4 };

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
      <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderCurve: 'continuous', paddingBottom: insets.bottom + 16, maxHeight: '90%' }}>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, borderCurve: 'continuous', backgroundColor: T.fillSecondary }} /></View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[ty.title3, { color: T.label, marginBottom: 14 }]}>Настройки канала</Text>

          <Pressable onPress={pickAvatar} style={{ alignSelf: 'center', marginBottom: 16 }}>
            {avatar ? <Image source={{ uri: avatar }} style={{ width: 88, height: 88, borderRadius: 24 }} contentFit="cover" />
              : <View style={{ width: 88, height: 88, borderRadius: 24, borderCurve: 'continuous', backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><SF name="photo" size={26} color={T.labelSecondary} /></View>}
            <Text style={[ty.caption1, { color: T.brand, textAlign: 'center', marginTop: 6 }]}>{avBusy ? 'Загрузка…' : 'Изменить фото'}</Text>
          </Pressable>

          <Text style={sectionLabel}>Название</Text>
          <TextInput value={name} onChangeText={setName} style={[inp, { marginBottom: 14 }]} />

          <Text style={sectionLabel}>Имя (@handle)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous', paddingLeft: 16, marginBottom: 14 }}>
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

          <Pressable onPress={invite} style={{ marginTop: 16, height: 46, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="square.and.arrow.up" size={16} color={T.brand} />
            <Text style={[ty.subheadEm, { color: T.brand }]}>Пригласительная ссылка</Text>
          </Pressable>

          <Text style={[sectionLabel, { marginTop: 20 }]}>Участники · {members.length}</Text>
          {members.length === 0 ? <Text style={[ty.subhead, { color: T.labelTertiary, marginLeft: 4 }]}>Пока нет участников.</Text> : members.map((m) => (
            <Wrapper marginBottom={8} key={m.id}><ContentBlock size="compact"><Wrapper dir={'row'} align={'center'} gap={10}>
              <View style={{ flex: 1 }}>
                <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{m.userName || m.userEmail}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{m.userEmail}</Text>
              </View>
              <Pressable onPress={() => remove(m.userId, m.userName || m.userEmail)} hitSlop={8}><SF name="xmark.circle.fill" size={20} color={T.red} /></Pressable>
            </Wrapper></ContentBlock></Wrapper>
          ))}

          <Pressable onPress={save} disabled={busy} style={{ marginTop: 20, height: 50, borderRadius: 16, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ty.headline, { color: '#fff' }]}>Сохранить</Text>}
          </Pressable>

          {/* Danger zone */}
          <Text style={[sectionLabel, { marginTop: 26, color: T.red }]}>Опасная зона</Text>
          <Pressable onPress={del} disabled={busy} style={{ height: 50, borderRadius: 16, borderCurve: 'continuous', backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="trash.fill" size={16} color="#fff" />
            <Text style={[ty.headline, { color: '#fff' }]}>Удалить канал</Text>
          </Pressable>
          <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 8, marginLeft: 4 }]}>Канал и все публикации будут удалены безвозвратно.</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
