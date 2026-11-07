import { z } from 'zod';
import { API_BASE } from './api';
import { netFetch } from './net';
import { ReadAccessError } from './readAccessError';

const rank = z.number().int().nonnegative();
const movement = { previousRank: rank.nullable().optional(), rankChange: z.number().int().nullable().optional() };
const schema = z.object({
  ok: z.literal(true),
  challenge: z.object({ id: z.string(), title: z.string(), currentDay: rank, durationDays: rank, season: rank.optional() }),
  teams: z.array(z.object({ id: z.string(), name: z.string(), points: z.number(), rank, members: rank, ...movement })),
  members: z.array(z.object({ id: z.string(), name: z.string(), teamId: z.string().nullable(), teamName: z.string(), points: z.number(), rank, teamRank: rank, ...movement, teamRankChange: z.number().int().nullable().optional(), avatar: z.string().nullable().optional() })),
});
export type SpectatorStandings = z.infer<typeof schema>;

export async function fetchSpectatorStandings(id: string, token: string | null, signal?: AbortSignal): Promise<SpectatorStandings> {
  if (!token) throw new ReadAccessError(401);
  const response = await netFetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(id)}/standings`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal, timeoutMs: 12000, retries: 0,
  });
  if ([401, 403, 404].includes(response.status)) throw new ReadAccessError(response.status);
  if (!response.ok) throw new Error('Рейтинг не загрузился');
  const data = schema.parse(await response.json());
  if (data.challenge.id !== id) throw new Error('Unexpected challenge');
  return data;
}
