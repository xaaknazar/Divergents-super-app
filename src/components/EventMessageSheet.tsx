import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTheme } from '../theme/ThemeContext';
import { HalfSheet } from './HalfSheet';
import { Button } from './Button';
import { EventTextField } from './EventTextField';
import { InlineNotice } from './InlineNotice';

export function EventMessageSheet({ mode, initialNote = '', initialReason = 'no_show', onClose, onSave }: {
  mode: 'announcement' | 'flag' | 'revoke'; initialNote?: string; initialReason?: 'no_show' | 'misconduct';
  onClose: () => void; onSave: (data: Record<string,unknown>) => Promise<void>;
}) {
  const { T, ty } = useTheme(); const [note, setNote] = useState(initialNote); const [reason, setReason] = useState(initialReason);
  const [busy, setBusy] = useState(false); const lock = useRef(false); const [error, setError] = useState<string>();
  const operation = useRef<{ body: string; id: string } | undefined>(undefined);
  const save = async () => {
    if (lock.current || !note.trim()) return;
    const body = { action: mode, reason, ...(mode === 'announcement' ? { text: note.trim() } : { note: note.trim() }) };
    const fingerprint = JSON.stringify(body);
    if (operation.current?.body !== fingerprint) operation.current = { body: fingerprint, id: Crypto.randomUUID() };
    lock.current = true; setBusy(true); setError(undefined);
    try { await onSave({ ...body, operationId: operation.current.id }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить. Повторите попытку.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const title = mode === 'announcement' ? 'Сообщение участникам' : mode === 'flag' ? 'Отметка после встречи' : 'Снять отметку';
  return <HalfSheet visible title={title} onClose={() => { if (!lock.current) onClose(); }} footer={<Button
    label={mode === 'announcement' ? 'Опубликовать и уведомить' : mode === 'flag' ? 'Сохранить отметку' : 'Снять отметку и уведомить'}
    disabled={!note.trim()} loading={busy} onPress={save} />}>
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>{mode === 'announcement'
      ? 'Сообщение появится на странице встречи. Принятые участники получат уведомление.'
      : mode === 'flag' ? 'Участник и организаторы его следующих заявок увидят причину и ваше пояснение. Баллы челленджей не меняются. Ошибочную отметку можно снять.'
      : 'Отметка исчезнет из профиля и анкет. Участник получит уведомление, а исправление останется в журнале.'}</Text>
    {mode === 'flag' ? <>
      <Button label="Не пришёл" variant={reason === 'no_show' ? 'tinted' : 'outline'} icon={reason === 'no_show' ? 'checkmark' : undefined} disabled={busy} onPress={() => setReason('no_show')} />
      <Button label="Нарушение правил" variant={reason === 'misconduct' ? 'tinted' : 'outline'} icon={reason === 'misconduct' ? 'checkmark' : undefined} disabled={busy} onPress={() => setReason('misconduct')} />
    </> : null}
    <EventTextField label={mode === 'announcement' ? 'Текст сообщения' : mode === 'flag' ? 'Что произошло' : 'Причина исправления'} mode="note" value={note} onChange={setNote} disabled={busy} />
    {error ? <InlineNotice message={error} /> : null}
  </HalfSheet>;
}
