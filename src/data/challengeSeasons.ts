import { z } from 'zod';
import { API_BASE } from './api';
import { netFetch } from './net';
const schema = z.object({ seasons: z.array(z.object({ id: z.string(), title: z.string(), season: z.number().int().positive(), startISO: z.string().nullable(), finished: z.boolean() })) });
export type ChallengeSeason = z.infer<typeof schema>['seasons'][number];
export async function fetchChallengeSeasons(token: string | null, signal?: AbortSignal): Promise<ChallengeSeason[]> {
  if (!token) throw new Error('Требуется вход');
  const response = await netFetch(`${API_BASE}/api/mobile/challenges/seasons`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal, timeoutMs: 12000, retries: 0 });
  if (!response.ok) throw new Error('Не удалось загрузить сезоны');
  return schema.parse(await response.json()).seasons;
}
