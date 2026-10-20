import { z } from 'zod';
import { API_BASE } from './api';
import { netFetch } from './net';
import { ReadingApiError } from './reading';
import { normalizeProfile, type TalentProfile } from './talentslab';

const applicationSchema = z.object({
  id: z.string(), teamId: z.string(), name: z.string(), status: z.enum(['pending', 'approved', 'rejected']),
  profile: z.record(z.unknown()).nullable(),
  profileStatus: z.enum(['live', 'snapshot', 'not_loaded', 'not_found', 'unavailable']),
});
export type ReadingApplicant = Omit<z.infer<typeof applicationSchema>, 'profile'> & { profile: TalentProfile | null };

/** Private questionnaire; no persistent cache across accounts or captains. */
export async function fetchReadingApplicant(token: string | null, challengeId: string, memberId: string): Promise<ReadingApplicant> {
  if (!token) throw new ReadingApiError('Войдите в аккаунт', 401);
  const response = await netFetch(`${API_BASE}/api/mobile/reading-challenges/${encodeURIComponent(challengeId)}/applications/${encodeURIComponent(memberId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, timeoutMs: 12_000, retries: 0,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ReadingApiError(typeof body?.message === 'string' ? body.message : 'Не удалось загрузить анкету', response.status);
  const parsed = applicationSchema.safeParse(body?.application);
  if (!parsed.success) throw new ReadingApiError('Не удалось прочитать анкету. Повторите попытку.', 503);
  return { ...parsed.data, profile: parsed.data.profile ? normalizeProfile(parsed.data.profile) : null };
}
