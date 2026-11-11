import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { randomUUID } from 'expo-crypto';
import { AttendanceCommand, AttendanceRecord, AttendanceStatus, fetchAttendanceRoster, saveAttendanceRecord } from '../data/eventAttendance';
import type { EventTarget } from '../data/eventManagement';
import { useEventResource } from './useEventResource';
export function useEventAttendance(target: EventTarget) {
  const { userId } = useAuth();
  const identity = `${userId}:${target.kind}:${target.eventId}`;
  const scope = useRef(identity); scope.current = identity;
  const generation = useRef(0);
  const resource = useEventResource(`roster:${target.kind}:${target.eventId}`, token => fetchAttendanceRoster(target, token));
  const [overrides, setOverrides] = useState<{ identity: string; rows: Record<string, AttendanceRecord> }>({ identity, rows: {} });
  const sending = useRef(new Set<string>());
  const commands = useRef(new Map<string, { fingerprint: string; command: AttendanceCommand }>());
  useEffect(() => {
    generation.current++; scope.current = identity; sending.current.clear(); commands.current.clear();
    return () => { generation.current++; scope.current = ''; };
  }, [identity]);
  const participants = (resource.data?.participants ?? []).map(p => {
    const local = overrides.identity === identity ? overrides.rows[p.applicationId] : undefined;
    return local && local.version >= (p.record?.version ?? 0) ? { ...p, record: local } : p;
  });
  const save = async (applicationId: string, status: AttendanceStatus, comment: string) => {
    const requestGeneration = generation.current;
    const isCurrent = () => scope.current === identity && generation.current === requestGeneration;
    if (sending.current.has(applicationId)) throw new Error('Отметка ещё сохраняется.');
    const person = participants.find(p => p.applicationId === applicationId);
    if (!person) throw new Error('Обновите список участников.');
    const fingerprint = JSON.stringify([applicationId, person.record?.version ?? 0, status, comment.trim()]);
    if (commands.current.get(applicationId)?.fingerprint !== fingerprint) commands.current.set(applicationId, { fingerprint,
      command: { applicationId, status, comment: comment.trim(), expectedVersion: person.record?.version ?? 0, operationId: randomUUID() } });
    const command = commands.current.get(applicationId)!.command;
    sending.current.add(applicationId);
    try {
      const token = await resource.getToken();
      if (!isCurrent()) throw new Error('Аккаунт или встреча изменились.');
      const saved = await saveAttendanceRecord(target, token, command);
      if (!isCurrent()) throw new Error('Аккаунт или встреча изменились.');
      if (saved.userId !== person.userId) throw new Error('Не удалось проверить отметку. Обновите список.');
      setOverrides(prev => ({ identity, rows: { ...(prev.identity === identity ? prev.rows : {}), [applicationId]: saved } }));
      commands.current.delete(applicationId);
    } finally { if (isCurrent()) sending.current.delete(applicationId); }
  };
  return { ...resource, participants, save };
}
