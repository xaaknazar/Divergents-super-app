// Creator-only form: create a community channel (Telegram-style).
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { SF } from '../../components/SFIcon';
import { PrimaryButton, ty } from '../../components/ui';
import { createChannel, ChannelAccess } from '../../data/channel';
import { useChannel } from '../../state/ChannelContext';
import { CommunityStackParams } from '../../navigation/types';
import { hSuccess } from '../../lib/haptics';
import { FormHeader, Field, inp } from './CreateChallengeScreen';

type Props = NativeStackScreenProps<CommunityStackParams, 'CreateChannel'>;

const ACCESS_OPTIONS: { key: ChannelAccess; label: string; icon: string; hint: string }[] = [
  { key: 'open', label: 'Открытый', icon: 'globe', hint: 'Подписаться может любой участник' },
  { key: 'request', label: 'По заявке', icon: 'lock.fill', hint: 'Вступление после одобрения' },
];

export function CreateChannelScreen({ navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { reload } = useChannel();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [access, setAccess] = useState<ChannelAccess>('open');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim().length > 1 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const token = await getToken();
      const res = await createChannel({
        name: name.trim(),
        handle: handle.trim().replace(/^@/, '') || undefined,
        access,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      }, token ?? '');
      if (res.ok) {
        hSuccess();
        reload();
        Alert.alert(tr('Канал создан'), tr('Новый канал опубликован в сообществе.'), [
          { text: tr('Готово'), onPress: () => navigation.navigate('CommunityHome', { refresh: Date.now() }) },
        ]);
      } else if (res.status === 403) {
        Alert.alert(tr('Недостаточно прав'), tr('Только организаторы могут создавать каналы.'));
      } else {
        Alert.alert(tr('Не удалось создать'), tr('Проверьте подключение и попробуйте ещё раз.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <FormHeader title={tr('Новый канал')} onCancel={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={8}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
          <Field label={tr('НАЗВАНИЕ')}>
            <TextInput value={name} onChangeText={setName} placeholder={tr('напр. Книжный клуб')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>

          <Field label={tr('ССЫЛКА (@handle, необязательно)')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.cardBg, borderRadius: 12, paddingHorizontal: 14 }}>
              <Text style={[ty.body, { color: T.labelTertiary }]}>@</Text>
              <TextInput value={handle} onChangeText={(t) => setHandle(t.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="bookclub" placeholderTextColor={T.labelTertiary} autoCapitalize="none" style={[ty.body, { flex: 1, paddingVertical: 12, color: T.label }]} />
            </View>
          </Field>

          <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>{tr('ДОСТУП')}</Text>
          <View style={{ gap: 10, marginBottom: 16 }}>
            {ACCESS_OPTIONS.map((opt) => {
              const on = access === opt.key;
              return (
                <Pressable key={opt.key} onPress={() => setAccess(opt.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: on ? T.brandTinted : T.cardBg, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: on ? 'transparent' : T.separator }}>
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: on ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                    <SF name={opt.icon} size={18} color={on ? '#fff' : T.labelSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[ty.subheadEm, { color: T.label }]}>{tr(opt.label)}</Text>
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{tr(opt.hint)}</Text>
                  </View>
                  <SF name={on ? 'checkmark.circle.fill' : 'circle'} size={22} color={on ? T.brand : T.labelTertiary} />
                </Pressable>
              );
            })}
          </View>

          <Field label={tr('ОПИСАНИЕ (необязательно)')}>
            <TextInput value={bio} onChangeText={setBio} placeholder={tr('О чём этот канал')} placeholderTextColor={T.labelTertiary} multiline style={[inp(T), { minHeight: 80, textAlignVertical: 'top' }]} />
          </Field>

          <Field label={tr('АВАТАР — URL (необязательно)')}>
            <TextInput value={avatarUrl} onChangeText={setAvatarUrl} placeholder="https://…" placeholderTextColor={T.labelTertiary} autoCapitalize="none" keyboardType="url" style={inp(T)} />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label={tr('Создать канал')} icon="paperplane.fill" loading={busy} color={canSubmit ? T.brand : T.labelTertiary} onPress={submit} />
      </View>
    </View>
  );
}
