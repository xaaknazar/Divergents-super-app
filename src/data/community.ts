// Community data: challenge scoring rules + live content fetched from the
// Divergents website API. The app is a client — real content (trips, sport,
// lectures, teams, the active challenge and its leaderboard) is published by
// the admin server-side and read here as JSON. On failure or empty response we
// return [] / null and the screens render a proper Russian empty state; we
// never fall back to fake/branded seed data.
import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';
import { API_BASE } from './api';

// ─── Small JSON fetch helper ───────────────────────────────────────────────
// getJsonResult distinguishes a real failure (network error, timeout, non-2xx,
// bad JSON → ok:false) from a valid-but-empty response (ok:true, data may be
// null/[]). This lets screens show a proper ERROR + RETRY state instead of an
// "empty" state when the server is unreachable. getJson keeps the simple
// null-on-failure contract for callers that only need the payload.
interface JsonResult { ok: boolean; data: any | null }

async function getJsonResult(path: string, timeoutMs = 12000): Promise<JsonResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, data: null };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, data: null };
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(path: string, timeoutMs = 12000): Promise<any | null> {
  return (await getJsonResult(path, timeoutMs)).data;
}

// ─── Challenge scoring model ───────────────────────────────────────────────
export interface MetricTask {
  id: string;
  kind: 'metric';
  title: string;
  icon: SFName;
  unit: string;       // "шагов", "стр."
  min: number;        // daily minimum
  current: number;    // user's current value today
  basePts: number;    // points for meeting the minimum
  unitSize: number;   // how many extra units earn one bonus point
  ptsPerUnit: number; // bonus points per unitSize over the minimum
}

export interface BinaryTask {
  id: string;
  kind: 'binary';
  title: string;
  icon: SFName;
  done: boolean;
  basePts: number;
}

export type ChallengeTask = MetricTask | BinaryTask;

export interface Challenge {
  id: string;
  title: string;
  teamName: string;
  totalDays: number;
  currentDay: number;
  members: number;
  startedLabel: string;
  teamRank: number;
  teamCount: number;
  trainer: string;
  price: string;
  tasks: ChallengeTask[];
}

// Neutral scaffold for the daily tracker before the server's active challenge
// loads (and a graceful no-crash fallback when there is none). No fake team,
// dates or user progress — just the program's three daily task definitions.
export const DEFAULT_CHALLENGE: Challenge = {
  id: 'divergents-daily',
  title: 'Divergents challenge',
  teamName: '',
  totalDays: 21,
  currentDay: 0,
  members: 0,
  startedLabel: '',
  teamRank: 0,
  teamCount: 0,
  trainer: '',
  price: '',
  tasks: [
    { id: 'steps', kind: 'metric', title: '10 000 шагов', icon: 'figure.walk', unit: 'шагов', min: 10000, current: 0, basePts: 10, unitSize: 100, ptsPerUnit: 1 },
    { id: 'sugar', kind: 'binary', title: 'День без сахара', icon: 'cube.fill', done: false, basePts: 10 },
    { id: 'reading', kind: 'metric', title: '10 страниц книги', icon: 'book.fill', unit: 'стр.', min: 10, current: 0, basePts: 10, unitSize: 1, ptsPerUnit: 2 },
  ],
};

// Points helpers (pure functions — the single source of truth for scoring).
export function taskBonus(t: ChallengeTask): number {
  if (t.kind !== 'metric') return 0;
  if (t.current <= t.min) return 0;
  return Math.floor((t.current - t.min) / t.unitSize) * t.ptsPerUnit;
}

export function taskDone(t: ChallengeTask): boolean {
  return t.kind === 'binary' ? t.done : t.current >= t.min;
}

export function taskPoints(t: ChallengeTask): number {
  if (!taskDone(t)) return 0;
  return t.basePts + taskBonus(t);
}

export function challengePointsToday(tasks: ChallengeTask[]): number {
  return tasks.reduce((sum, t) => sum + taskPoints(t), 0);
}

export function challengeBonusToday(tasks: ChallengeTask[]): number {
  return tasks.reduce((sum, t) => sum + taskBonus(t), 0);
}

// Team leaderboard. The user's "weekBase" excludes today; today's points are
// added live so rank can change as the user logs activity.
export interface Member {
  id: string;
  name: string;
  weekBase: number;
  day: number;
  isMe?: boolean;
}

export const MEDAL_FOR_RANK = (rank: number): { icon: SFName; color: string } | null => {
  if (rank === 1) return { icon: 'crown.fill', color: '#D4AF37' };
  if (rank === 2) return { icon: 'medal.fill', color: '#A8A9AD' };
  if (rank === 3) return { icon: 'medal.fill', color: '#CD7F32' };
  return null;
};

// Live active challenge + its full team leaderboard.
export interface ActiveChallengeData { challenge: Challenge | null; members: Member[] }

export async function fetchActiveChallenge(): Promise<ActiveChallengeData> {
  const d = await getJson('/api/mobile/community/challenges/active');
  if (!d || !d.challenge) return { challenge: null, members: [] };
  return {
    challenge: d.challenge as Challenge,
    members: Array.isArray(d.members) ? (d.members as Member[]) : [],
  };
}

// ─── Trips ─────────────────────────────────────────────────────────────────
export interface ItineraryItem { day: string; title: string; note: string; icon: SFName; color: string; }
export interface Trip {
  id: string;
  date: string;
  title: string;
  region: string;
  meta: string;
  tint: string;
  days: number;
  going: number;
  spots: number;
  price: string;
  difficulty: string;
  organizer: string;
  organizerType: string;
  description: string;
  itinerary: ItineraryItem[];
  included: { icon: SFName; t: string }[];
  imageUrl?: string | null;
}

export async function fetchTrips(): Promise<Trip[]> {
  const d = await getJson('/api/mobile/community/trips');
  return Array.isArray(d?.trips) ? (d.trips as Trip[]) : [];
}

export async function fetchTrip(id: string): Promise<Trip | null> {
  const d = await getJson(`/api/mobile/community/trips/${id}`);
  if (!d || !d.id) return null;
  return d as Trip;
}

// ─────────────────────────────────────────────────────────────
// Divergents Challenge — static program rules (not fake content)
// ─────────────────────────────────────────────────────────────
export interface ChallengeCategory {
  key: 'R' | 'NS' | 'A';
  title: string;
  norm: string;
  scoring: string;
  icon: SFName;
  color: string;
}

export const CHALLENGE_CATEGORIES: ChallengeCategory[] = [
  { key: 'R', title: 'Чтение', norm: '20 страниц в день', scoring: '1 балл за страницу · худлит — 0.5', icon: 'book.fill', color: T.brand },
  { key: 'NS', title: 'No Sugar', norm: 'Полностью без сахара', scoring: 'Читмил: 2 ч.л. мёда + 1 финик в день', icon: 'cube.fill', color: T.red },
  { key: 'A', title: 'Активность', norm: '10 000 шагов в день', scoring: '1 балл за 400 шагов · минимум 5 000', icon: 'figure.walk', color: T.green },
];

export const CHALLENGE_RULES: string[] = [
  'Три категории: Чтение (R), No Sugar (NS), Активность (A). Норма: 20 страниц и 10 000 шагов в день.',
  'Баллы: 1 страница = 1 балл (худлит — 0.5), день без сахара = 0 баллов, 400 шагов = 1 балл.',
  'Активность можно набирать бегом, плаванием, велосипедом и силовыми (см. таблицу пересчёта).',
  'Отчёт за день — в чат команды до 23:00. Опоздание: −300 баллов и три 🚩.',
  'Штраф за невыполнение нормы: −100 баллов и 🚩 по этой категории. Баллы не уходят в минус (минимум 0).',
  '3 🚩 по одной категории → 🏳️ и вылет. Очки фиксируются.',
  'Команда — ровно 30 человек: капитан и 2 советника, выбранные участниками.',
  'Никнейм ≤ 9 символов, близкий к ФИО. Фиксируйте аэробную нагрузку для проверки.',
  'Читмил: до 2 ч.л. мёда с горкой в день; несладкие сухофрукты и финики — без ограничений.',
  'Побеждает команда с наибольшей суммой баллов всех участников.',
];

export const ACTIVITY_CONVERSIONS: { label: string; value: string }[] = [
  { label: 'Бег', value: '1 км = 2000 шагов' },
  { label: 'Плавание', value: '100 м = 1000 шагов' },
  { label: 'Велосипед', value: '3 км = 2000 шагов' },
  { label: 'Отжимания', value: '1 повт = 20 шагов' },
  { label: 'Приседания', value: '1 повт = 15 шагов' },
  { label: 'Пресс (скручивания)', value: '1 повт = 20 шагов' },
  { label: 'Подтягивания', value: '1 повт = 40 шагов' },
  { label: 'Планка', value: '2 мин = 400 шагов' },
  { label: 'Йога / пилатес (для девушек)', value: '30 мин = 2000 шагов' },
];

// ─── Teams (live) ────────────────────────────────────────────────────────
export interface ChallengeTeam {
  id: string;
  name: string;
  members: number;
  capacity: number;
  captain: string;
  advisors: string[];
  tint: string;
}

export async function fetchTeams(): Promise<ChallengeTeam[]> {
  const d = await getJson('/api/mobile/community/teams');
  return Array.isArray(d?.teams) ? (d.teams as ChallengeTeam[]) : [];
}

export function teamsNeed(teams: ChallengeTeam[]): number {
  return teams.reduce((s, t) => s + Math.max(0, t.capacity - t.members), 0);
}

// ─── Challenges catalog (live) ───────────────────────────────────────────
export interface ChallengeListItem {
  id: string;
  title: string;
  subtitle: string;
  status: 'upcoming' | 'active' | 'finished';
  startISO?: string;
  startLabel: string;
  durationDays: number;
  maxFlags: number;
  participants: number;
  teams: number;
  tint: string;
  icon: SFName;
}

export async function fetchChallenges(): Promise<ChallengeListItem[]> {
  const d = await getJson('/api/mobile/community/challenges');
  return Array.isArray(d?.challenges) ? (d.challenges as ChallengeListItem[]) : [];
}

export function getChallengeMeta(list: ChallengeListItem[], id: string) {
  return list.find((c) => c.id === id);
}

export function daysUntil(iso?: string): number {
  if (!iso) return 0;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

// ─── Спорт ─────────────────────────────────────────────────────────
export interface SportActivity {
  id: string;
  title: string;
  place: string;
  date: string;
  icon: SFName;
  going: number;
  spotsLabel: string;
  tint: string;
}

export async function fetchSport(): Promise<SportActivity[]> {
  const d = await getJson('/api/mobile/community/sport');
  return Array.isArray(d?.activities) ? (d.activities as SportActivity[]) : [];
}

// ─── Встречи: онлайн-лекции ─────────────────────────────────────────
export interface Lecture {
  id: string;
  title: string;
  speaker: string;
  date: string;
  durationLabel: string;
  live: boolean;
  seatsLabel: string;
  imageUrl: string;
}

export async function fetchLectures(): Promise<Lecture[]> {
  const d = await getJson('/api/mobile/community/lectures');
  return Array.isArray(d?.lectures) ? (d.lectures as Lecture[]) : [];
}

// ─── Aggregated loaders (error-aware) ───────────────────────────────────────
// These fetch several sections together and report `error: true` only when
// EVERY underlying request failed (network down / server unreachable), so a
// single empty section never masquerades as a connection error.
export interface CommunityHomeData {
  trips: Trip[];
  sport: SportActivity[];
  challenges: ChallengeListItem[];
  error: boolean;
}

export async function fetchCommunityHome(): Promise<CommunityHomeData> {
  const [t, s, c] = await Promise.all([
    getJsonResult('/api/mobile/community/trips'),
    getJsonResult('/api/mobile/community/sport'),
    getJsonResult('/api/mobile/community/challenges'),
  ]);
  return {
    trips: Array.isArray(t.data?.trips) ? (t.data.trips as Trip[]) : [],
    sport: Array.isArray(s.data?.activities) ? (s.data.activities as SportActivity[]) : [],
    challenges: Array.isArray(c.data?.challenges) ? (c.data.challenges as ChallengeListItem[]) : [],
    error: !t.ok && !s.ok && !c.ok,
  };
}

export interface ChallengesBundle {
  challenges: ChallengeListItem[];
  teams: ChallengeTeam[];
  error: boolean;
}

export async function fetchChallengesAndTeams(): Promise<ChallengesBundle> {
  const [c, t] = await Promise.all([
    getJsonResult('/api/mobile/community/challenges'),
    getJsonResult('/api/mobile/community/teams'),
  ]);
  return {
    challenges: Array.isArray(c.data?.challenges) ? (c.data.challenges as ChallengeListItem[]) : [],
    teams: Array.isArray(t.data?.teams) ? (t.data.teams as ChallengeTeam[]) : [],
    error: !c.ok && !t.ok,
  };
}
