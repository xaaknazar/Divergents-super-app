import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTheme } from '../theme/ThemeContext';
import { useEventResource } from '../state/useEventResource';
import { changeEvent, fetchEventManagement, type EventTarget } from '../data/eventManagement';
import { ListSection } from './ListSection';
import { ListRow } from './ListRow';
import { InlineNotice } from './InlineNotice';
import { Button } from './Button';
import { EventEditSheet } from './EventEditSheet';
import { EventMessageSheet } from './EventMessageSheet';

export function EventManagementPanel({ kind, eventId, onChanged, onAttendance }: EventTarget & { onChanged?: () => void; onAttendance: () => void }) {
  const { T, ty } = useTheme(); const resource = useEventResource(`event:${kind}:${eventId}`, token => fetchEventManagement({ kind, eventId }, token));
  const [mode, setMode] = useState<'edit' | 'announcement'>(); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const completeOperation = useRef<string | null>(null);
  if (!resource.signedIn) return null;
  const { data } = resource;
  const save = async (input: Record<string,unknown>) => {
    await changeEvent({ kind, eventId }, input, await resource.getToken());
    await resource.refresh(); onChanged?.();
  };
  const complete = () => Alert.alert('Завершить встречу?', 'Набор закроется. Состав участников сохранится, и вы сможете отметить тех, кто не пришёл или нарушил правила. Автоматических флагов не будет.', [
    { text: 'Отмена', style: 'cancel' }, { text: 'Завершить', onPress: async () => {
      if (lock.current) return; lock.current = true; setBusy(true);
      completeOperation.current ??= Crypto.randomUUID();
      try { await save({ action: 'complete', operationId: completeOperation.current }); }
      catch (e) { Alert.alert('Не удалось завершить встречу', e instanceof Error ? e.message : 'Повторите попытку.'); }
      finally { lock.current = false; setBusy(false); }
    } },
  ]);
  return <View style={styles.content}>
    {resource.error ? <ListSection header="Новости встречи"><View style={styles.copy}><InlineNotice message={resource.error} /><Button label="Повторить" variant="plain" onPress={resource.refresh} /></View></ListSection> : null}
    {resource.loading && !data ? <ActivityIndicator accessibilityLabel="Загрузка новостей встречи" color={T.brand} /> : null}
    {data?.canManage ? <ListSection header="Управление встречей">
      {!data.finished ? <ListRow title="Изменить данные" subtitle="Описание, место, время и количество мест" chevron onPress={() => setMode('edit')} /> : null}
      <ListRow title="Сообщение участникам" subtitle="Опубликовать дополнение и уведомить принятых" chevron onPress={() => setMode('announcement')} />
      {data.finished ? <ListRow title="Посещение и отметки" subtitle="Встреча завершена · только принятые участники" chevron onPress={onAttendance} />
        : data.canComplete ? <View style={styles.copy}><Button label="Завершить встречу" variant="tinted" loading={busy} onPress={complete} /></View>
        : <View style={styles.copy}><Text style={[ty.footnote, { color: T.labelSecondary }]}>Завершение и отметки о посещении появятся после начала встречи.</Text></View>}
    </ListSection> : null}
    {data?.announcements.length ? <ListSection header="Сообщения организатора">{data.announcements.map(a => <View key={a.id} style={[styles.copy, { borderBottomColor: T.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{new Date(a.createdAt).toLocaleString('ru-RU')}</Text>
      <Text style={[ty.body, { color: T.label }]}>{a.text}</Text>
    </View>)}</ListSection> : null}
    {mode === 'edit' && data ? <EventEditSheet initial={data.event} onSave={save} onClose={() => setMode(undefined)} /> : null}
    {mode === 'announcement' ? <EventMessageSheet mode="announcement" onSave={save} onClose={() => setMode(undefined)} /> : null}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 16 }, copy: { padding: 16, gap: 8 } });
