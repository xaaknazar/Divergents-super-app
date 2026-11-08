import { API_BASE } from '../config';
import type { EventKind } from './community';

export type ParticipationStatus = 'upcoming' | 'active' | 'finished' | 'left' | 'eliminated';
export interface ApplicantActivity {
  applicationId: string;
  challenges: Array<{
    challengeId: string; title: string; teamName: string | null; startDate: string | null; status: ParticipationStatus;
    result: { points: number; rank: number; totalMembers: number } | null;
  }>;
  reading: Array<{
    challengeId: string; title: string; level: string; teamName: string | null; joinedAt: string; status: ParticipationStatus;
    result: { pages: number; elapsedMs: number; completedDays: number; readingDays: number; averagePages: number | null; flags: number } | null;
  }>;
}

/** No mock results for another person's application. Missing/unavailable is different from zero. */
export async function fetchApplicantActivity(kind: EventKind, eventId: string, applicationId: string,
  token: string | null | undefined, signal: AbortSignal): Promise<ApplicantActivity> {
  if (!token) throw new Error('Unauthorized');
  const query = `kind=${encodeURIComponent(kind)}&eventId=${encodeURIComponent(eventId)}&applicationId=${encodeURIComponent(applicationId)}`;
  const res = await fetch(`${API_BASE}/api/mobile/event-applicant-activity?${query}`, {
    signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Activity unavailable');
  const data = await res.json();
  if (data?.applicationId !== applicationId || !Array.isArray(data.challenges) || !Array.isArray(data.reading))
    throw new Error('Invalid activity');
  return data;
}
