// Настройки канала для автора: фото, название, @имя, описание, приватность, приглашение,
// участники и удаление. Сеть и подтверждения — у экрана; лист хранит только черновик.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { count } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { Button } from './Button';
import { ChannelAvatar } from './ChannelAvatar';
import { ChannelTextField } from './ChannelTextField';
import { MemberAvatar } from './MemberAvatar';
import { Segmented } from './Segmented';
import { SF } from './SFIcon';
import { SheetModal } from './SheetModal';

export type ChannelSettingsValues = { name: string; handle: string; bio: string; access: 'open' | 'request'; avatarUrl: string | null };
export type ChannelMemberView = { userId: string; name: string; email?: string };

export function ChannelSettingsSheet({ visible, initial, members, onPickAvatar, onSave, onInvite, onRemoveMember, onDelete, onClose }: {
  visible: boolean; initial: ChannelSettingsValues; members: ChannelMemberView[];
  onPickAvatar: () => Promise<string | null>; onSave: (values: ChannelSettingsValues) => Promise<boolean>;
  onInvite: () => void; onRemoveMember: (member: ChannelMemberView) => void; onDelete: () => void; onClose: () => void;
}) {
  const { T, ty } = useTheme();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (visible) setValues(initial); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof ChannelSettingsValues>(key: K) => (value: ChannelSettingsValues[K]) => setValues(v => ({ ...v, [key]: value }));
  const pick = async () => { setUploading(true); try { const url = await onPickAvatar(); if (url) set('avatarUrl')(url); } finally { setUploading(false); } };
  const save = async () => { setSaving(true); try { await onSave(values); } finally { setSaving(false); } };
  return <SheetModal visible={visible} title="Настройки канала" onClose={onClose} tall>
    <Pressable onPress={pick} disabled={uploading} accessibilityRole="button" accessibilityLabel="Изменить фото канала" style={styles.photo}>
      <ChannelAvatar name={values.name || 'К'} uri={values.avatarUrl} size="large" />
      <Text style={[ty.subheadEm, { color: T.brandText }]}>{uploading ? 'Загружаем фото…' : 'Изменить фото'}</Text>
    </Pressable>
    <ChannelTextField label="Название" value={values.name} onChange={set('name')} autoCapitalize="sentences" />
    <ChannelTextField label="Имя канала" prefix="@" value={values.handle} onChange={set('handle')} placeholder="channel" autoCapitalize="none" />
    <ChannelTextField label="Описание" value={values.bio} onChange={set('bio')} placeholder="О чём этот канал" multiline autoCapitalize="sentences" />
    <View style={styles.group}>
      <Text style={[ty.footnoteEm, styles.caption, { color: T.labelSecondary }]}>Приватность</Text>
      <Segmented items={['Открытый', 'По заявке']} value={values.access === 'open' ? 0 : 1} onChange={i => set('access')(i === 0 ? 'open' : 'request')} leadingIcons={['globe', 'lock.fill']} />
      <Text style={[ty.footnote, styles.caption, { color: T.labelSecondary }]}>{values.access === 'open' ? 'Любой может вступить и читать публикации.' : 'Новые участники вступают после вашего одобрения.'}</Text>
    </View>
    <Button label="Сохранить" size="large" loading={saving} disabled={values.name.trim().length < 2} onPress={save} />
    <Button label="Пригласительная ссылка" icon="square.and.arrow.up" variant="tinted" onPress={onInvite} />
    <View style={styles.group}>
      <Text style={[ty.footnoteEm, styles.caption, { color: T.labelSecondary }]}>{count(members.length, 'участник', 'участника', 'участников')}</Text>
      <View style={[styles.list, { backgroundColor: T.cardBg }]}>
        {members.length === 0 ? <Text style={[ty.subhead, styles.empty, { color: T.labelSecondary }]}>Пока нет участников.</Text>
          : members.map((m, i) => <View key={m.userId} style={[styles.member, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.separator } : null]}>
            <MemberAvatar name={m.name} size={34} />
            <View style={styles.memberText}>
              <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{m.name}</Text>
              {m.email && m.email !== m.name ? <Text style={[ty.footnote, { color: T.labelSecondary }]} numberOfLines={1}>{m.email}</Text> : null}
            </View>
            <Pressable onPress={() => onRemoveMember(m)} accessibilityRole="button" accessibilityLabel={`Удалить участника ${m.name}`}
              style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.5 : 1 }]}>
              <SF name="xmark.circle.fill" size={22} color={T.labelTertiary} />
            </Pressable>
          </View>)}
      </View>
    </View>
    <View style={styles.group}>
      <Button label="Удалить канал" icon="trash.fill" variant="tinted" tone="danger" onPress={onDelete} />
      <Text style={[ty.footnote, styles.caption, { color: T.labelSecondary }]}>Канал и все публикации будут удалены безвозвратно.</Text>
    </View>
  </SheetModal>;
}
const styles = StyleSheet.create({
  photo: { alignSelf: 'center', alignItems: 'center', gap: 8, paddingVertical: 6 },
  group: { gap: 6 },
  caption: { paddingHorizontal: 4 },
  list: { borderRadius: radius.block, borderCurve: 'continuous', overflow: 'hidden' },
  empty: { padding: 16 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, minHeight: 56 },
  memberText: { flex: 1, minWidth: 0 },
  remove: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
});
