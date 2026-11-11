import { z } from 'zod';
import { API_BASE } from '../config';
import type { EventTarget } from './eventManagement';
export const ATTENDANCE_OPTIONS = [
  { status: 'arrived', label: 'Пришёл', emoji: '✅' },
  { status: 'late', label: 'Опоздал', emoji: '🪱' },
  { status: 'absent', label: 'Не пришёл', emoji: '☠️' },
] as const;
export type AttendanceStatus = typeof ATTENDANCE_OPTIONS[number]['status'];
const status = z.enum(['arrived', 'late', 'absent']);
const record = z.object({ id: z.string(), applicationId: z.string(), userId: z.string(), status, comment: z.string(), version: z.number().int().positive(), updatedAt: z.string().datetime() });
const roster = z.object({ kind: z.enum(['trip', 'sport', 'meetup']), eventId: z.string(), title: z.string(),
  participants: z.array(z.object({ applicationId: z.string(), userId: z.string(), name: z.string(), record: record.nullable() })) });
export type AttendanceRecord = z.infer<typeof record>;
export type AttendanceParticipant = z.infer<typeof roster>['participants'][number];
export type AttendanceRoster = z.infer<typeof roster>;
export interface AttendanceCommand { applicationId: string; operationId: string; expectedVersion: number; status: AttendanceStatus; comment: string }
async function request(target: EventTarget, token: string | null, body?: AttendanceCommand) {
  if (!token) throw new Error('Войдите в аккаунт, чтобы продолжить.');
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const url = `${API_BASE}/api/mobile/events/attendance${body ? '' : `?kind=${target.kind}&eventId=${encodeURIComponent(target.eventId)}`}`;
    const response = await fetch(url, { method: body ? 'POST' : 'GET', signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify({ ...target, ...body }) } : {}) });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.message ?? 'Не удалось подтвердить отметку. Обновите список и повторите.');
    return json;
  } catch (e) {
    if (e instanceof TypeError || (e instanceof Error && e.name === 'AbortError')) throw new Error('Нет подтверждения сервера. Проверьте связь и обновите список.');
    throw e;
  } finally { clearTimeout(timer); }
}
export async function fetchAttendanceRoster(target: EventTarget, token: string | null) {
  const parsed = roster.safeParse(await request(target, token));
  if (!parsed.success) throw new Error('Не удалось проверить список участников. Обновите его.');
  const result = parsed.data;
  if (result.kind !== target.kind || result.eventId !== target.eventId || new Set(result.participants.map(p => p.applicationId)).size !== result.participants.length
    || result.participants.some(p => p.record && (p.record.userId !== p.userId || p.record.applicationId !== p.applicationId))) throw new Error('Не удалось проверить список участников. Обновите его.');
  return result;
}
export async function saveAttendanceRecord(target: EventTarget, token: string | null, command: AttendanceCommand) {
  const raw = await request(target, token, command);
  const parsed = record.safeParse(raw?.record);
  if (!parsed.success) throw new Error('Не удалось проверить отметку. Обновите список.');
  const saved = parsed.data;
  if (raw?.ok !== true || raw.operationId !== command.operationId || raw.kind !== target.kind || raw.eventId !== target.eventId
    || raw.applicationId !== command.applicationId || saved.applicationId !== command.applicationId || saved.version !== command.expectedVersion + 1
    || saved.status !== command.status || saved.comment !== command.comment.trim()) throw new Error('Сервер не подтвердил эту отметку. Обновите список и проверьте её.');
  return saved;
}
