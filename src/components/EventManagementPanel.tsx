import React, { useEffect, useRef, useState } from 'react';
import { AppState, Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useEventResource } from '../state/useEventResource';
import { changeEvent, fetchEventManagement, type EventTarget } from '../data/eventManagement';
import { EventManagementContent } from './EventManagementContent';
import { EventEditSheet } from './EventEditSheet';
import { EventMessageSheet } from './EventMessageSheet';

export function EventManagementPanel({ kind, eventId, onChanged, onAttendance }: EventTarget & { onChanged?: () => void; onAttendance: () => void }) {
  const resource = useEventResource(`event:${kind}:${eventId}`, token => fetchEventManagement({ kind, eventId }, token));
  const [mode, setMode] = useState<'edit' | 'announcement'>(); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const completeOperation = useRef<string | null>(null);
  const { data } = resource;
  useEffect(() => {
    if (!data?.canManage || data.canTakeAttendance || !data.startsAt || !data.serverNow) return;
    const delay = Date.parse(data.startsAt) - Date.parse(data.serverNow);
    if (!Number.isFinite(delay)) return;
    const timer = setTimeout(() => { void resource.refresh(); }, Math.min(2147483000, Math.max(500, delay + 500)));
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void resource.refresh(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [data?.canManage, data?.canTakeAttendance, data?.startsAt, data?.serverNow, resource.refresh]);
  if (!resource.signedIn) return null;
  const save = async (input: Record<string,unknown>) => {
    await changeEvent({ kind, eventId }, input, await resource.getToken());
    await resource.refresh(); onChanged?.();
  };
  const complete = () => Alert.alert('Завершить встречу?', 'Набор закроется. Состав участников и отметки о посещении сохранятся. Их можно будет исправить и после завершения.', [
    { text: 'Отмена', style: 'cancel' }, { text: 'Завершить', onPress: async () => {
      if (lock.current) return; lock.current = true; setBusy(true);
      completeOperation.current ??= Crypto.randomUUID();
      try { await save({ action: 'complete', operationId: completeOperation.current }); }
      catch (e) { Alert.alert('Не удалось завершить встречу', e instanceof Error ? e.message : 'Повторите попытку.'); }
      finally { lock.current = false; setBusy(false); }
    } },
  ]);
  return <>
    <EventManagementContent data={data} loading={resource.loading} error={resource.error} busy={busy}
      onRetry={resource.refresh} onEdit={() => setMode('edit')} onAnnounce={() => setMode('announcement')}
      onAttendance={onAttendance} onComplete={complete} />
    {mode === 'edit' && data ? <EventEditSheet initial={data.event} onSave={save} onClose={() => setMode(undefined)} /> : null}
    {mode === 'announcement' ? <EventMessageSheet mode="announcement" onSave={save} onClose={() => setMode(undefined)} /> : null}
  </>;
}
