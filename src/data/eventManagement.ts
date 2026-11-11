import { API_BASE } from '../config';
import type { EventKind } from './community';
export interface EventDraft { title: string; description: string; place: string; meetAt: string; spots: number; meetLat: number | null; meetLng: number | null; updatedAt: string }
export interface EventManagement { canTakeAttendance?: boolean; startsAt?: string | null; serverNow?: string; canManage: boolean; finished: boolean; canComplete: boolean; event: EventDraft; announcements: { id: string; text: string; createdAt: string }[] }
export interface AttendanceFlag { id: string; kind: EventKind; eventId: string; eventTitle: string; eventDate: string | null; reason: 'no_show' | 'misconduct'; note: string; createdAt: string }
export interface AttendanceVisit { id: string; kind: EventKind; eventId: string; eventTitle: string; eventDate: string | null; status: 'arrived' | 'late' | 'absent'; comment: string; updatedAt: string }
export interface Attendance { visits?: AttendanceVisit[]; flags: AttendanceFlag[]; canMark: boolean; canRevoke: boolean }
export interface EventTarget { kind: EventKind; eventId: string }
export interface ApplicantTarget extends EventTarget { applicationId: string }
async function request<T>(path: string, token: string | null | undefined, body?: object): Promise<T> {
  if (!token) throw new Error('Войдите в аккаунт, чтобы продолжить.');
  const ctrl = new AbortController(); const timeout = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${API_BASE}/api/mobile/${path}`, { method: body ? 'POST' : 'GET', signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) throw new Error(d?.message ?? 'Не удалось загрузить или сохранить данные. Повторите попытку.');
    return d as T;
  } catch (e) {
    if (e instanceof Error && e.name !== 'AbortError' && e.message !== 'Network request failed') throw e;
    throw new Error('Нет подтверждения сервера. Проверьте связь и повторите попытку.');
  } finally { clearTimeout(timeout); }
}
const query = (t: EventTarget) => `kind=${t.kind}&eventId=${encodeURIComponent(t.eventId)}`;
export const fetchEventManagement = (t: EventTarget, token?: string | null) => request<EventManagement>(`events/manage?${query(t)}`, token);
export const changeEvent = (t: EventTarget, body: Record<string, unknown>, token?: string | null) => request<{ ok: true }>('events/manage', token, { ...body, ...t });
export const fetchAttendance = (t: ApplicantTarget | undefined, token?: string | null) => request<Attendance>(`event-attendance${t ? `?${query(t)}&applicationId=${encodeURIComponent(t.applicationId)}` : ''}`, token);
export interface MyEvent extends EventTarget { title: string; meetAt: string | null; finished: boolean; isCreator: boolean }
export const fetchMyEvents = (token?: string | null) => request<{ events: MyEvent[] }>('me/events', token);
