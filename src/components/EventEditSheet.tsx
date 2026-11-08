import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import { HalfSheet } from './HalfSheet';
import { Button } from './Button';
import { InlineNotice } from './InlineNotice';
import { EventDateField } from './EventDateField';
import { EventTextField } from './EventTextField';
import type { EventDraft } from '../data/eventManagement';
import { useTheme } from '../theme/ThemeContext';

export function EventEditSheet({ initial, onSave, onClose }: { initial: EventDraft; onSave: (data: Record<string,unknown>) => Promise<void>; onClose: () => void }) {
  const { T, ty } = useTheme(); const [draft, setDraft] = useState(initial); const [spots, setSpots] = useState(String(initial.spots));
  const [lat, setLat] = useState(initial.meetLat == null ? '' : String(initial.meetLat)); const [lng, setLng] = useState(initial.meetLng == null ? '' : String(initial.meetLng));
  const [busy, setBusy] = useState(false); const lock = useRef(false); const [error, setError] = useState<string>();
  const operation = useRef<{ body: string; id: string } | undefined>(undefined);
  const set = (key: keyof EventDraft) => (value: string) => setDraft(d => ({ ...d, [key]: value }));
  const save = async () => {
    if (lock.current) return;
    if (!draft.title.trim() || !draft.place.trim() || !draft.meetAt.trim() || !/^\d+$/.test(spots) || (Boolean(lat.trim()) !== Boolean(lng.trim())) || (lat && (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))))) { setError('Укажите название, место, дату, число мест и корректные координаты.'); return; }
    const body = { ...draft, spots: Number(spots), meetLat: lat.trim() ? Number(lat) : null, meetLng: lng.trim() ? Number(lng) : null, action: 'edit' };
    const fingerprint = JSON.stringify(body);
    if (operation.current?.body !== fingerprint) operation.current = { body: fingerprint, id: Crypto.randomUUID() };
    lock.current = true; setBusy(true); setError(undefined);
    try { await onSave({ ...body, operationId: operation.current.id }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить. Повторите попытку.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <HalfSheet visible title="Изменить встречу" onClose={() => { if (!lock.current) onClose(); }} footer={<Button label="Сохранить и уведомить" loading={busy} onPress={save} />}>
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>Принятым участникам придёт уведомление об изменениях.</Text>
    <EventTextField label="Название" value={draft.title} onChange={set('title')} disabled={busy} />
    <EventTextField label="Описание" mode="description" value={draft.description} onChange={set('description')} disabled={busy} required={false} />
    <EventTextField label="Место встречи" value={draft.place} onChange={set('place')} disabled={busy} />
    <EventDateField value={draft.meetAt} onChange={set('meetAt')} disabled={busy} />
    <EventTextField label="Количество мест · 0 — без ограничения" mode="number" value={spots} onChange={setSpots} disabled={busy} />
    <EventTextField label="Широта точки встречи" mode="coordinate" value={lat} onChange={setLat} disabled={busy} required={false} />
    <EventTextField label="Долгота точки встречи" mode="coordinate" value={lng} onChange={setLng} disabled={busy} required={false} />
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>При смене адреса обновите точку или очистите обе координаты, чтобы карта не вела по старому адресу.</Text>
    {error ? <InlineNotice message={error} /> : null}
  </HalfSheet>;
}
