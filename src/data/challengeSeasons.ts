import { z } from 'zod';
import { API_BASE } from './api';
import { netFetch } from './net';
import { fetchSpectatorStandings } from './challengeSpectator';
const schema = z.object({ seasons: z.array(z.object({ id: z.string(), title: z.string(), season: z.number().int().positive(), startISO: z.string().nullable(), finished: z.boolean() })) });
export type ChallengeSeason = z.infer<typeof schema>['seasons'][number] & { champion?: { id: string; name: string } | null };
export async function fetchChallengeSeasons(token: string | null, signal?: AbortSignal): Promise<ChallengeSeason[]> {
  if (!token) throw new Error('Требуется вход');
  const response = await netFetch(`${API_BASE}/api/mobile/challenges/seasons`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal, timeoutMs: 12000, retries: 0 });
  if (!response.ok) throw new Error('Не удалось загрузить сезоны');
  return schema.parse(await response.json()).seasons;
}

/** Read the server's final first place, never calculate scores or call a live leader champion. */
export async function fetchSeasonChampion(season: ChallengeSeason, token: string | null, signal?: AbortSignal): Promise<ChallengeSeason['champion']> {
  if (!season.finished) return null;
  const standings = await fetchSpectatorStandings(season.id, token, signal);
  if (standings.challenge.finished !== true) return null;
  const winner = standings.teams.find(team => team.rank === 1 && team.points > 0 && team.name.trim());
  return winner ? { id: winner.id, name: winner.name.trim() } : null;
}
