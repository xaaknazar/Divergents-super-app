// Community data: challenge scoring rules + live content fetched from the
// Divergents website API. The app is a client — real content (trips, teams and
// the challenges catalog) is published by the admin server-side and read here
// as JSON, then MAPPED from the server's raw shapes into the view-model shapes
// the community screens already consume. On failure or empty response we return
// [] / null and the screens render a proper Russian empty/error state; we never
// fall back to fake/branded seed data.
import { z } from 'zod';
import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';
import { API_BASE, formatPrice } from './api';
import { fetchJson, arrayOf, zId, zStr, zStrN, zNumN } from './contracts/http';
import { TalentProfile, normalizeProfile } from './talentslab';

// ─── Server contracts (GET /api/mobile/{trips,challenges,sport}) ─────────────
// Zod schemas validate every response at the network boundary and are the single
// source of truth for the raw types (inferred via z.infer). Fields are lenient
// (nullish text, string|number ids) so a valid row is never dropped; malformed
// rows are dropped individually by arrayOf rather than failing the whole list.
const CountSchema = z.object({ applications: z.number().nullish() }).partial().nullish();

const RawTeamSchema = z.object({
  id: zId,
  name: zStr(''),
  capacity: zNumN,
  captain: zStrN,     // Clerk userId of the captain (or null)
  captainName: zStrN, // resolved display name (server-side)
  advisors: z.array(z.string()).nullish(), // 2 advisor display names (optional)
  _count: CountSchema,
}).passthrough();

const RawChallengeSchema = z.object({
  id: zId,
  title: zStr(''),
  startISO: zStrN,
  durationDays: zNumN,
  categories: z.union([z.array(z.string()), z.string()]).nullish().catch(null),
  rules: zStrN,
  price: zNumN,
  status: zStr(''),
  teams: arrayOf(RawTeamSchema, 'team'),
  _count: CountSchema,
}).passthrough();

const RawTripSchema = z.object({
  id: zId,
  title: zStr(''),
  region: zStrN,
  date: zStrN,
  days: zNumN,
  price: zNumN,
  spots: zNumN,
  difficulty: zStrN,
  description: zStrN,
  status: zStr(''),
  createdBy: zStrN,
  _count: CountSchema,
}).passthrough();

const RawSportSchema = z.object({
  id: zId,
  title: zStr(''),
  place: zStr(''),
  date: zStr(''),
  spots: zNumN,
  description: zStrN,
  meetLat: zNumN,
  meetLng: zNumN,
  meetAt: zStrN,
  _count: CountSchema,
}).passthrough();

type RawTeam = z.infer<typeof RawTeamSchema>;
type RawChallenge = z.infer<typeof RawChallengeSchema>;
type RawTrip = z.infer<typeof RawTripSchema>;
type RawSport = z.infer<typeof RawSportSchema>;

// The list endpoints return { trips|challenges|sport: [...] } (or, defensively, a
// bare array). Normalize to a resilient array so a non-object 200 body still
// yields [] instead of an error — matching the previous behavior exactly.
function pickArr(d: unknown, key: string): unknown[] {
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>)[key])) {
    return (d as Record<string, unknown[]>)[key];
  }
  return [];
}
const TripListSchema = z.preprocess((d) => pickArr(d, 'trips'), arrayOf(RawTripSchema, 'trip'));
const ChallengeListSchema = z.preprocess((d) => pickArr(d, 'challenges'), arrayOf(RawChallengeSchema, 'challenge'));
const SportListSchema = z.preprocess((d) => pickArr(d, 'sport'), arrayOf(RawSportSchema, 'sport'));

// ─── Deterministic decoration (icon/tint by index) ──────────────────────────
// Reuse the soft iOS-tinted palette the cards already render against.
const TINTS = ['#E8ECFB', '#E5DCEC', '#DEF0DF', '#FEEAD0', '#FCE2E2', '#E1E7F8'];
const CHALLENGE_ICONS: SFName[] = ['flame.fill', 'figure.walk', 'bolt.fill', 'star.fill', 'target', 'trophy.fill'];
const tintAt = (i: number): string => TINTS[((i % TINTS.length) + TINTS.length) % TINTS.length];
const challengeIconAt = (i: number): SFName => CHALLENGE_ICONS[((i % CHALLENGE_ICONS.length) + CHALLENGE_ICONS.length) % CHALLENGE_ICONS.length];

// ─── Russian date / text helpers ────────────────────────────────────────────
const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function ruShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
}

// Trips may carry a free-form date string ("12–15 августа") or an ISO date.
function tripDateLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  return ruShortDate(raw) || String(raw);
}

function applicationsOf(c: { _count?: { applications?: number | null } | null } | null | undefined): number {
  const n = c?._count?.applications;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function categoriesText(categories: string[] | string | null | undefined): string {
  if (Array.isArray(categories)) return categories.filter(Boolean).join(' · ');
  if (typeof categories === 'string') return categories;
  return '';
}

function rulesSnippet(rules: string | null | undefined): string {
  if (!rules) return '';
  const s = rules.trim();
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

// maxFlags defaults to 3; if the rules text mentions "N 🚩" / "N флаг" use it.
function parseMaxFlags(rules: string | null | undefined): number {
  if (!rules) return 3;
  const m = rules.match(/(\d+)\s*🚩/) || rules.match(/(\d+)\s*флаг/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0 && n < 100) return n;
  }
  return 3;
}

function mapStatus(status: string): 'upcoming' | 'active' | 'finished' {
  if (status === 'open') return 'upcoming';
  if (status === 'active') return 'active';
  return 'finished';
}

// Phase is DATE-DRIVEN: набор until the start date, then active for `durationDays`,
// then finished. Falls back to the server status when there is no start date.
function challengePhase(startISO: string | null | undefined, durationDays: number, serverStatus: string): 'upcoming' | 'active' | 'finished' {
  const startMs = startISO ? Date.parse(startISO) : NaN;
  if (!isFinite(startMs)) return mapStatus(serverStatus);
  const now = Date.now();
  if (now < startMs) return 'upcoming';
  if (now < startMs + Math.max(1, durationDays) * 86400000) return 'active';
  return 'finished';
}

function challengeStartLabel(c: RawChallenge): string {
  const startMs = c.startISO ? Date.parse(c.startISO) : NaN;
  if (isFinite(startMs) && Date.now() >= startMs) return 'идёт';
  return ruShortDate(c.startISO) || 'скоро';
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

// Per-category flag counts (🚩). Auto-scored server-side per the Divergents
// rules: a missed daily norm adds a 🚩 to its category; 3 🚩 in one category
// → 🏳️ and elimination (points frozen).
export interface FlagCounts {
  R: number;  // Reading
  NS: number; // No Sugar
  A: number;  // Activity
}

export interface MemberTaskProgress {
  id: string;
  kind: 'metric' | 'binary';
  title: string;
  icon: SFName;
  unit: string;
  target: number | null;
  value: number;
  done: boolean;
  marked: boolean;
  completed: boolean;
}

// One row of the cross-team leaderboard (server-computed, all teams by points).
export interface TeamStanding {
  id: string;
  name: string;
  points: number;
  members: number;
  rank: number;
  isMine: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  startISO?: string;
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
  // The signed-in user's own disciplinary state (server-computed).
  flags?: FlagCounts;
  eliminated?: boolean;
  teamId?: string | null;
  teamChat?: string | null;   // team's Telegram chat link (members open it)
  captainId?: string | null;  // Clerk id of the team captain (drives captain-only tools)
  teamStandings?: TeamStanding[]; // all teams by points → the «Рейтинг команд» screen
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
  teamStandings: [],
  trainer: '',
  price: '',
  // Scoring mirrors the Divergents rules exactly (see CHALLENGE_RULES):
  //  • Чтение: норма 20 стр., 1 балл за страницу → basePts 20 + 1 за каждую стр. сверх.
  //  • No Sugar: условие-гейт, 0 баллов за соблюдение (нарушение штрафуется сервером).
  //  • Активность: норма 10 000 шагов, 1 балл за 400 шагов → basePts 25 + 1 за каждые 400 сверх.
  tasks: [
    { id: 'reading', kind: 'metric', title: '20 страниц книги', icon: 'book.fill', unit: 'стр.', min: 20, current: 0, basePts: 20, unitSize: 1, ptsPerUnit: 1 },
    { id: 'sugar', kind: 'binary', title: 'День без сахара', icon: 'cube.fill', done: false, basePts: 0 },
    { id: 'steps', kind: 'metric', title: '10 000 шагов', icon: 'figure.walk', unit: 'шагов', min: 10000, current: 0, basePts: 25, unitSize: 400, ptsPerUnit: 1 },
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
  // Server-computed disciplinary state. flags are per-category 🚩 counts;
  // eliminated freezes the member's points (🏳️ / «выбыл»). penalty is the total
  // штрафных баллов (−100/−300), отрицательное число; уже учтено в weekBase.
  flags?: FlagCounts;
  eliminated?: boolean;
  penalty?: number;
  previousRank?: number | null;
  rankChange?: number | null;
  averagePoints?: number;
  todayTasks: MemberTaskProgress[];
}

export const MEDAL_FOR_RANK = (rank: number): { icon: SFName; color: string } | null => {
  if (rank === 1) return { icon: 'crown.fill', color: '#D4AF37' };
  if (rank === 2) return { icon: 'medal.fill', color: '#A8A9AD' };
  if (rank === 3) return { icon: 'medal.fill', color: '#CD7F32' };
  return null;
};

// Live active challenge + its full team leaderboard.
export interface ActiveChallengeData {
  challenge: Challenge | null;
  members: Member[];
  // Distinguishes a valid `{ challenge: null }` response from a network/auth
  // failure. Without this, a brief outage can incorrectly remove the active
  // challenge from the UI while the participant is still enrolled.
  ok: boolean;
}

const EMPTY_ACTIVE: ActiveChallengeData = { challenge: null, members: [], ok: false };

// ─── Raw server shapes (GET /api/mobile/challenges/active) ──────────────────
// The server returns the exact { challenge, members } shape: challenge carries
// the daily metric/binary task definitions (incl. the user's current values),
// members is the full team leaderboard. We pass it through with light guards.
interface RawActiveTask {
  id?: unknown; kind?: unknown; title?: unknown; icon?: unknown;
  unit?: unknown; min?: unknown; current?: unknown; basePts?: unknown;
  unitSize?: unknown; ptsPerUnit?: unknown; done?: unknown;
}
interface RawActiveChallenge {
  id?: unknown; title?: unknown; teamName?: unknown; totalDays?: unknown;
  startISO?: unknown;
  currentDay?: unknown; members?: unknown; startedLabel?: unknown;
  teamRank?: unknown; teamCount?: unknown; trainer?: unknown; price?: unknown;
  tasks?: unknown; flags?: unknown; eliminated?: unknown; teamStandings?: unknown;
}
interface RawActiveMember {
  id?: unknown; name?: unknown; weekBase?: unknown; day?: unknown; isMe?: unknown;
  flags?: unknown; eliminated?: unknown; penalty?: unknown;
  previousRank?: unknown; rankChange?: unknown; averagePoints?: unknown; todayTasks?: unknown;
}

const numOf = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const strOf = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);

// Safely read the per-category 🚩 counts ({ R, NS, A }) from a server payload,
// defaulting every category to 0.
function flagsOf(v: unknown): FlagCounts {
  const f = (v ?? {}) as Record<string, unknown>;
  return { R: numOf(f.R), NS: numOf(f.NS), A: numOf(f.A) };
}

export function totalFlags(f: FlagCounts | undefined): number {
  return f ? f.R + f.NS + f.A : 0;
}

// Coerce a server icon string to the app's SFName type safely: keep any
// non-empty string (SF() degrades unknown names to a neutral glyph), else use a
// kind-appropriate fallback so the card always renders an icon.
function coerceIcon(raw: unknown, fallback: SFName): SFName {
  return typeof raw === 'string' && raw.length > 0 ? (raw as SFName) : fallback;
}

function mapActiveTask(raw: RawActiveTask): ChallengeTask | null {
  const id = strOf(raw.id);
  if (!id) return null;
  const title = strOf(raw.title);
  if (raw.kind === 'binary') {
    return {
      id,
      kind: 'binary',
      title,
      icon: coerceIcon(raw.icon, 'checkmark.circle.fill'),
      done: raw.done === true,
      basePts: numOf(raw.basePts, 10),
    };
  }
  return {
    id,
    kind: 'metric',
    title,
    icon: coerceIcon(raw.icon, 'target'),
    unit: strOf(raw.unit),
    min: numOf(raw.min),
    current: numOf(raw.current),
    basePts: numOf(raw.basePts, 10),
    unitSize: Math.max(1, numOf(raw.unitSize, 1)),
    ptsPerUnit: numOf(raw.ptsPerUnit, 1),
  };
}

function mapActiveChallenge(raw: RawActiveChallenge): Challenge | null {
  const id = strOf(raw.id);
  if (!id) return null;
  const tasks = (Array.isArray(raw.tasks) ? raw.tasks : [])
    .map(mapActiveTask)
    .filter((t): t is ChallengeTask => t !== null);
  return {
    id,
    title: strOf(raw.title, 'Divergents challenge'),
    startISO: typeof raw.startISO === 'string' ? raw.startISO : undefined,
    teamName: strOf(raw.teamName),
    totalDays: numOf(raw.totalDays, 21),
    currentDay: numOf(raw.currentDay),
    members: numOf(raw.members),
    startedLabel: strOf(raw.startedLabel),
    teamRank: numOf(raw.teamRank),
    teamCount: numOf(raw.teamCount),
    teamStandings: (Array.isArray(raw.teamStandings) ? raw.teamStandings : [])
      .map((r: any): TeamStanding => ({
        id: strOf(r?.id),
        name: strOf(r?.name, 'Команда'),
        points: numOf(r?.points),
        members: numOf(r?.members),
        rank: numOf(r?.rank),
        isMine: r?.isMine === true,
      }))
      .filter((t: TeamStanding) => t.id),
    trainer: strOf(raw.trainer),
    price: strOf(raw.price),
    tasks,
    flags: flagsOf(raw.flags),
    eliminated: raw.eliminated === true,
    teamId: (raw as any).teamId ?? null,
    teamChat: (raw as any).teamChat ?? null,
    captainId: (raw as any).captainId ?? null,
  };
}

function mapActiveMember(raw: RawActiveMember): Member | null {
  const id = strOf(raw.id);
  if (!id) return null;
  return {
    id,
    name: strOf(raw.name, 'Участник'),
    weekBase: numOf(raw.weekBase),
    day: numOf(raw.day),
    isMe: raw.isMe === true,
    flags: flagsOf(raw.flags),
    eliminated: raw.eliminated === true,
    penalty: numOf(raw.penalty),
    previousRank: typeof raw.previousRank === 'number' ? numOf(raw.previousRank) : null,
    rankChange: typeof raw.rankChange === 'number' ? numOf(raw.rankChange) : null,
    averagePoints: numOf(raw.averagePoints),
    todayTasks: (Array.isArray(raw.todayTasks) ? raw.todayTasks : [])
      .map((task: any): MemberTaskProgress | null => {
        const taskId = strOf(task?.id);
        if (!taskId) return null;
        return {
          id: taskId,
          kind: task?.kind === 'binary' ? 'binary' : 'metric',
          title: strOf(task?.title, 'Цель'),
          icon: coerceIcon(task?.icon, task?.kind === 'binary' ? 'checkmark.circle.fill' : 'target'),
          unit: strOf(task?.unit),
          target: typeof task?.target === 'number' ? numOf(task.target) : null,
          value: numOf(task?.value),
          done: task?.done === true,
          marked: task?.marked === true,
          completed: task?.completed === true,
        };
      })
      .filter((task): task is MemberTaskProgress => task !== null),
  };
}

// GET /api/mobile/challenges/active (Clerk Bearer) — the live active challenge
// for the signed-in user: its daily-task structure + the full team leaderboard.
// Returns { challenge:null, members:[] } on failure / empty so the screen falls
// back to the local DEFAULT_CHALLENGE tracker and a proper empty state.
export async function fetchActiveChallenge(
  token?: string | null,
  timeoutMs = 12000,
): Promise<ActiveChallengeData> {
  if (!token) return EMPTY_ACTIVE;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/mobile/challenges/active`, { signal: ctrl.signal, headers });
    if (!res.ok) return EMPTY_ACTIVE;
    const data = await res.json();
    const challenge = data?.challenge ? mapActiveChallenge(data.challenge) : null;
    const rawMembers: RawActiveMember[] = Array.isArray(data?.members) ? data.members : [];
    const members = rawMembers
      .map(mapActiveMember)
      .filter((m): m is Member => m !== null);
    // Backfill the members count from the roster when the challenge omits it.
    if (challenge && challenge.members === 0 && members.length) challenge.members = members.length;
    return { challenge, members, ok: true };
  } catch {
    return EMPTY_ACTIVE;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/mobile/challenges/:id/progress (Clerk Bearer) — best-effort sync of
// a single daily task update ({ taskId, value } for metric, { taskId, done } for
// binary). Local optimistic state is the source of truth, so this never throws
// and simply resolves false when the sync isn't possible.
export async function postChallengeProgress(
  challengeId: string,
  body: { taskId: string; value?: number; done?: boolean },
  token?: string | null,
  timeoutMs = 12000,
): Promise<boolean> {
  if (!challengeId || !body.taskId || !token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/progress`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
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

function mapTrip(raw: RawTrip, index: number): Trip {
  const region = raw.region ?? '';
  const dateLabel = tripDateLabel(raw.date);
  const meta = [region, dateLabel].filter(Boolean).join(' · ');
  return {
    id: raw.id,
    date: dateLabel,
    title: raw.title ?? '',
    region,
    meta,
    tint: tintAt(index),
    days: typeof raw.days === 'number' ? raw.days : 0,
    going: applicationsOf(raw),
    spots: typeof raw.spots === 'number' ? raw.spots : 0,
    price: formatPrice(raw.price),
    difficulty: raw.difficulty ?? '—',
    organizer: raw.createdBy ?? '',
    organizerType: 'Divergents',
    description: raw.description ?? '',
    itinerary: [],
    included: [],
    imageUrl: null,
  };
}

export async function fetchTrips(): Promise<Trip[]> {
  const { data } = await fetchJson('/api/mobile/trips', TripListSchema);
  return (data ?? []).map(mapTrip);
}

// The server has no trip-detail endpoint — fetch the list and find by id.
export async function fetchTrip(id: string): Promise<Trip | null> {
  const trips = await fetchTrips();
  return trips.find((t) => t.id === id) ?? null;
}

// ─── Creator/admin: publish new content (Clerk Bearer) ──────────────────────
// Authenticated POST helper used by the in-app creation forms. Distinguishes a
// permission failure (403 → the user isn't a creator) from other errors so the
// UI can show a precise Russian message. Returns a normalized result instead of
// throwing so screens stay crash-free.
export interface CreateResult { ok: boolean; status: number; id?: string; error?: string }

async function postAuthedJson(
  path: string,
  body: unknown,
  token: string,
  timeoutMs = 15000,
): Promise<CreateResult> {
  if (!token) return { ok: false, status: 401, error: 'no-token' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* empty / non-JSON body */ }
    if (!res.ok) return { ok: false, status: res.status, error: data?.error || data?.message };
    return { ok: true, status: res.status, id: data?.id ?? data?.challenge?.id ?? data?.trip?.id };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export interface NewChallengeTeam { name: string; capacity: number }
export interface NewChallengeInput {
  title: string;
  startISO: string;
  durationDays: number;
  teams: NewChallengeTeam[];
  price?: number | null;
  categories?: string[];
}

// POST /api/mobile/challenges — daily tasks are seeded server-side, so the
// payload only carries the program shell (title, dates, teams, price).
export async function createChallenge(input: NewChallengeInput, token: string): Promise<CreateResult> {
  return postAuthedJson('/api/mobile/challenges', input, token);
}

export interface NewTripInput {
  title: string;
  region: string;
  date: string;
  days: number;
  price?: number | null;
  spots: number;
  difficulty?: string;
  description?: string;
}

// POST /api/mobile/trips — publish a new community trip.
export async function createTrip(input: NewTripInput, token: string): Promise<CreateResult> {
  return postAuthedJson('/api/mobile/trips', input, token);
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
  { key: 'NS', title: 'No Sugar', norm: 'Полностью без сахара', scoring: 'Читмил: 2 ч.л. мёда/день; фрукты и финики — без ограничений', icon: 'cube.fill', color: T.red },
  { key: 'A', title: 'Активность', norm: '10 000 шагов в день', scoring: '1 балл за 400 шагов · минимум 5 000', icon: 'figure.walk', color: T.green },
];

export const CHALLENGE_RULES: string[] = [
  'Старт: челлендж активируется в 23:00 накануне первого дня. Например, старт «28-го» — трекер открывается в 23:00 27-го.',
  'День идёт с 23:01 до 23:00 следующего дня. Каждая отметка сразу сохраняется; отдельный отчёт отправлять не нужно.',
  'Три категории: Чтение (R), No Sugar (NS), Активность (A). Норма: 20 страниц и 10 000 шагов в день.',
  'Баллы: 1 страница = 1 балл (худлит — 0.5), день без сахара = 0 баллов, 400 шагов = 1 балл.',
  'Активность можно набирать бегом, плаванием, велосипедом и силовыми (см. таблицу пересчёта).',
  'Изменения принимаются до закрытия дня. Если за день нет ни одной отметки: −300 баллов и три 🚩.',
  'Штраф за невыполнение нормы: −100 баллов и 🚩 по этой категории. Баллы не уходят в минус (минимум 0).',
  'Баллы команды обновляются по отметкам и окончательно пересчитываются в 23:01 при закрытии дня.',
  '3 🚩 по одной категории → 🏳️ и вылет. Очки фиксируются.',
  'Размер команды задаёт организатор (например, 20–35 человек): капитан и 2 советника, выбранные участниками.',
  'Никнейм ≤ 9 символов и не более одной заглавной буквы, близкий к ФИО. Фиксируйте аэробную нагрузку для проверки.',
  'Читмил: до 2 ч.л. мёда с горкой в день; фрукты, несладкие сухофрукты и финики — без ограничений.',
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
  captain: string;   // display name ('—' when none)
  captainId: string; // Clerk userId ('' when none) — for "am I the captain" checks
  advisors: string[];
  tint: string;
}

function mapTeam(raw: RawTeam, index: number): ChallengeTeam {
  return {
    id: raw.id,
    name: raw.name ?? '',
    members: applicationsOf(raw),
    capacity: typeof raw.capacity === 'number' ? raw.capacity : 0,
    captain: raw.captainName || '—',
    captainId: raw.captain ?? '',
    advisors: Array.isArray(raw.advisors) ? raw.advisors.filter((a): a is string => typeof a === 'string' && a.trim().length > 0) : [],
    tint: tintAt(index),
  };
}

// The teams (join) screen lists the teams of the first joinable challenge:
// prefer an 'open' challenge, else the 'active' one.
function teamsFromChallenges(list: RawChallenge[]): ChallengeTeam[] {
  const target = list.find((c) => c.status === 'open') || list.find((c) => c.status === 'active');
  const teams = target?.teams;
  return Array.isArray(teams) ? teams.map(mapTeam) : [];
}

export async function fetchTeams(): Promise<ChallengeTeam[]> {
  const { data } = await fetchJson('/api/mobile/challenges', ChallengeListSchema);
  return teamsFromChallenges(data ?? []);
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
  // The teams of THIS challenge (mapped). Screens must scope team selection to
  // the challenge being viewed — never to a global "first open challenge" list.
  teamList: ChallengeTeam[];
  tint: string;
  icon: SFName;
}

function mapChallenge(raw: RawChallenge, index: number): ChallengeListItem {
  const teamList = Array.isArray(raw.teams) ? raw.teams.map(mapTeam) : [];
  return {
    id: raw.id,
    title: raw.title ?? '',
    subtitle: categoriesText(raw.categories) || rulesSnippet(raw.rules),
    status: challengePhase(raw.startISO, typeof raw.durationDays === 'number' ? raw.durationDays : 0, raw.status),
    startISO: raw.startISO ?? undefined,
    startLabel: challengeStartLabel(raw),
    durationDays: typeof raw.durationDays === 'number' ? raw.durationDays : 0,
    maxFlags: parseMaxFlags(raw.rules),
    participants: applicationsOf(raw),
    teams: teamList.length,
    teamList,
    tint: tintAt(index),
    icon: challengeIconAt(index),
  };
}

export async function fetchChallenges(): Promise<ChallengeListItem[]> {
  const { data } = await fetchJson('/api/mobile/challenges', ChallengeListSchema);
  return (data ?? []).map(mapChallenge);
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
  note?: string;
  meetLat?: number | null;
  meetLng?: number | null;
  meetAt?: string | null;
}

// Server-backed sport activities (GET /api/mobile/sport). Now validated through
// the contracts layer, which also gives it the 12s abort-timeout it lacked.
export async function fetchSport(): Promise<SportActivity[]> {
  const { data } = await fetchJson('/api/mobile/sport', SportListSchema);
  return (data ?? []).map((x): SportActivity => ({
    id: x.id,
    title: x.title,
    place: x.place,
    date: x.date,
    icon: 'figure.run',
    going: applicationsOf(x),
    spotsLabel: x.spots ? `${x.spots} мест` : 'Открыто',
    tint: 'rgba(35,64,136,0.12)',
    note: x.description ?? undefined,
    meetLat: x.meetLat ?? null,
    meetLng: x.meetLng ?? null,
    meetAt: x.meetAt ?? null,
  }));
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

// No server endpoint for lectures — return empty (screen empty state).
// DEFERRED: backend needs an online-lectures model/endpoint to populate this.
export async function fetchLectures(): Promise<Lecture[]> {
  return [];
}

// ─── Aggregated loaders (error-aware) ───────────────────────────────────────
// These fetch several sections together and report `error: true` only when
// EVERY underlying (existing) request failed (network down / server
// unreachable), so a single empty section never masquerades as a connection
// error. Sport has no endpoint, so it is always [] and never affects `error`.
export interface CommunityHomeData {
  trips: Trip[];
  sport: SportActivity[];
  challenges: ChallengeListItem[];
  error: boolean;
}

export async function fetchCommunityHome(): Promise<CommunityHomeData> {
  const [t, c, sport] = await Promise.all([
    fetchJson('/api/mobile/trips', TripListSchema),
    fetchJson('/api/mobile/challenges', ChallengeListSchema),
    fetchSport(),
  ]);
  return {
    trips: (t.data ?? []).map(mapTrip),
    sport,
    challenges: (c.data ?? []).map(mapChallenge),
    error: t.error && c.error,
  };
}

export interface ChallengesBundle {
  challenges: ChallengeListItem[];
  teams: ChallengeTeam[];
  error: boolean;
}

export async function fetchChallengesAndTeams(): Promise<ChallengesBundle> {
  const { data, error } = await fetchJson('/api/mobile/challenges', ChallengeListSchema);
  const list = data ?? [];
  return {
    challenges: list.map(mapChallenge),
    teams: teamsFromChallenges(list),
    error,
  };
}

// ─── Challenge applications (admin/captain review) ───────────────────────────
export type ChallengeAppStatus = 'pending' | 'approved' | 'rejected';

export interface ChallengeApplicant {
  id: string;
  applicantUserId: string;
  userEmail: string;
  userName: string;
  status: ChallengeAppStatus;
  feedback: string;
  telegram: string | null;
  coefficient: number;
  teamId: string | null;
  teamName: string;
  date: string;
  profile: TalentProfile | null;
}

// Admin sees all applicants; a team captain sees only their team's. `canManage`
// tells the app whether to show admin-only controls (assign captain, move team).
export async function fetchChallengeApplicants(
  challengeId: string, token: string | null | undefined,
): Promise<{ applicants: ChallengeApplicant[]; canManage: boolean }> {
  if (!token) return { applicants: [], canManage: false };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/applications`, {
      signal: ctrl.signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { applicants: [], canManage: false };
    const d = await res.json();
    const list: any[] = Array.isArray(d?.applications) ? d.applications : [];
    return {
      canManage: !!d?.canManage,
      applicants: list.map((a) => ({
        id: String(a.id),
        applicantUserId: String(a.applicantUserId ?? ''),
        userEmail: a.userEmail ?? '',
        userName: a.userName ?? '',
        status: (a.status ?? 'pending') as ChallengeAppStatus,
        feedback: a.feedback ?? '',
        telegram: a.telegram ?? null,
        coefficient: typeof a.coefficient === 'number' ? a.coefficient : 1,
        teamId: a.teamId ?? null,
        teamName: a.teamName ?? '',
        date: a.date ?? '',
        profile: a.profile ? normalizeProfile(a.profile) : null,
      })),
    };
  } catch { return { applicants: [], canManage: false }; }
  finally { clearTimeout(t); }
}

// Captain/admin: set status + feedback (accept/reject with reason); admin may
// also move the applicant to a team via `teamId`.
export async function decideChallengeApplication(
  challengeId: string, applicantUserId: string,
  patch: { status?: ChallengeAppStatus; feedback?: string; teamId?: string },
  token: string | null | undefined,
): Promise<boolean> {
  if (!token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/applications`, {
      method: 'PATCH', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ applicantUserId, ...patch }),
    });
    return res.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

// Admin: assign (userId) or clear (null) a team's captain.
export async function assignTeamCaptain(
  challengeId: string, teamId: string, captainUserId: string | null, token: string | null | undefined,
): Promise<boolean> {
  if (!token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/teams/${encodeURIComponent(teamId)}`, {
      method: 'PATCH', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ captain: captainUserId }),
    });
    return res.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

// The signed-in user's own challenge applications (status + captain/admin reason).
export interface MyChallengeApplication {
  challengeId: string;
  title: string;
  teamName: string;
  status: ChallengeAppStatus;
  feedback: string;
  date: string;
}
export async function fetchMyChallengeApplications(token: string | null | undefined): Promise<MyChallengeApplication[]> {
  if (!token) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/me/challenge-applications`, {
      signal: ctrl.signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const d = await res.json();
    const list: any[] = Array.isArray(d?.applications) ? d.applications : [];
    return list.map((a) => ({
      challengeId: String(a.challengeId ?? ''),
      title: a.title ?? '',
      teamName: a.teamName ?? '',
      status: (a.status ?? 'pending') as ChallengeAppStatus,
      feedback: a.feedback ?? '',
      date: a.date ?? '',
    }));
  } catch { return []; } finally { clearTimeout(t); }
}

// ─── Manage challenge (creator, only BEFORE start) ───────────────────────────
export interface ManageTeam {
  id: string; name: string; capacity: number;
  captainId: string | null; captainName: string | null; memberCount: number;
}
export interface ManageMember {
  applicationId: string; userId: string; userName: string; userEmail: string;
  status: ChallengeAppStatus; teamId: string | null; telegram: string | null;
}
export interface ChallengeManage {
  canManage: boolean;
  challenge: { id: string; title: string; startISO: string | null; durationDays: number; price: string | null; status: string; started: boolean; editable: boolean };
  teams: ManageTeam[];
  members: ManageMember[];
}
type EditResult = { ok: boolean; reason?: 'started' | 'error' };

// Everything the creator's manage screen needs, in one call. null on failure/403.
export async function fetchChallengeManage(challengeId: string, token: string | null | undefined): Promise<ChallengeManage | null> {
  if (!token) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/manage`, {
      signal: ctrl.signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d?.challenge) return null;
    return {
      canManage: !!d.canManage,
      challenge: {
        id: String(d.challenge.id), title: String(d.challenge.title ?? ''),
        startISO: d.challenge.startISO ?? null, durationDays: Number(d.challenge.durationDays) || 21,
        price: d.challenge.price ?? null, status: String(d.challenge.status ?? ''),
        started: !!d.challenge.started, editable: !!d.challenge.editable,
      },
      teams: (Array.isArray(d.teams) ? d.teams : []).map((tm: any) => ({
        id: String(tm.id), name: String(tm.name ?? ''), capacity: Number(tm.capacity) || 0,
        captainId: tm.captainId ?? null, captainName: tm.captainName ?? null, memberCount: Number(tm.memberCount) || 0,
      })),
      members: (Array.isArray(d.members) ? d.members : []).map((m: any) => ({
        applicationId: String(m.applicationId), userId: String(m.userId),
        userName: m.userName ?? '', userEmail: m.userEmail ?? '',
        status: (m.status ?? 'pending') as ChallengeAppStatus, teamId: m.teamId ?? null, telegram: m.telegram ?? null,
      })),
    };
  } catch { return null; } finally { clearTimeout(t); }
}

async function patchJson(path: string, body: unknown, token: string): Promise<EditResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, reason: 'started' };
    return { ok: false, reason: 'error' };
  } catch { return { ok: false, reason: 'error' }; } finally { clearTimeout(t); }
}

// Edit challenge-level fields (title / duration / price / start). Before start.
export function updateChallenge(challengeId: string, patch: { title?: string; durationDays?: number; price?: string | null; startISO?: string }, token: string | null | undefined): Promise<EditResult> {
  if (!token) return Promise.resolve({ ok: false, reason: 'error' });
  return patchJson(`/api/mobile/challenges/${encodeURIComponent(challengeId)}`, patch, token);
}

// Edit a team (name / capacity / captain). Before start.
export function updateChallengeTeam(challengeId: string, teamId: string, patch: { name?: string; capacity?: number; captain?: string | null }, token: string | null | undefined): Promise<EditResult> {
  if (!token) return Promise.resolve({ ok: false, reason: 'error' });
  return patchJson(`/api/mobile/challenges/${encodeURIComponent(challengeId)}/teams/${encodeURIComponent(teamId)}`, patch, token);
}

// Move a participant to another team. Before start.
export function moveChallengeParticipant(challengeId: string, applicantUserId: string, teamId: string, token: string | null | undefined): Promise<EditResult> {
  if (!token) return Promise.resolve({ ok: false, reason: 'error' });
  return patchJson(`/api/mobile/challenges/${encodeURIComponent(challengeId)}/applications`, { applicantUserId, teamId }, token);
}

// Remove a participant from the challenge entirely. Before start.
export async function removeChallengeParticipant(challengeId: string, applicantUserId: string, token: string | null | undefined): Promise<EditResult> {
  if (!token) return { ok: false, reason: 'error' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/applications?userId=${encodeURIComponent(applicantUserId)}`, {
      method: 'DELETE', signal: ctrl.signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, reason: 'started' };
    return { ok: false, reason: 'error' };
  } catch { return { ok: false, reason: 'error' }; } finally { clearTimeout(t); }
}

// ─── Team comms (captain) ────────────────────────────────────────────────────
// Set (or clear with '') the team's Telegram chat link. Captain or admin.
export async function setTeamChat(challengeId: string, teamId: string, telegramChat: string | null, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/team`, {
      method: 'PATCH', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ teamId, telegramChat: telegramChat ?? null }),
    });
    return res.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

// Broadcast a push to every member of the team. Captain or admin.
export async function broadcastTeam(challengeId: string, teamId: string, message: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/team`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ teamId, message }),
    });
    return res.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

// ─── История моих челленджей (GET /api/mobile/me/challenges) ───────
export interface ChallengeHistoryItem {
  challengeId: string;
  title: string;
  startISO: string | null;
  durationDays: number;
  challengeStatus: string;   // open | active | archived …
  teamName: string | null;
  status: string;            // pending | approved | rejected
  joinedAt: string;
}

export async function fetchMyChallengeHistory(token: string | null): Promise<ChallengeHistoryItem[]> {
  if (!token) return [];
  try {
    const r = await fetch(`${API_BASE}/api/mobile/me/challenges`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return [];
    const d = await r.json();
    const list: any[] = Array.isArray(d?.history) ? d.history : [];
    return list.map((x) => ({
      challengeId: String(x.challengeId),
      title: String(x.title ?? ''),
      startISO: x.startISO ?? null,
      durationDays: Number(x.durationDays) || 0,
      challengeStatus: String(x.challengeStatus ?? ''),
      teamName: x.teamName ?? null,
      status: String(x.status ?? 'pending'),
      joinedAt: String(x.joinedAt ?? ''),
    }));
  } catch { return []; }
}
