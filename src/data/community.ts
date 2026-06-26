// Community data: challenge scoring rules + live content fetched from the
// Divergents website API. The app is a client — real content (trips, teams and
// the challenges catalog) is published by the admin server-side and read here
// as JSON, then MAPPED from the server's raw shapes into the view-model shapes
// the community screens already consume. On failure or empty response we return
// [] / null and the screens render a proper Russian empty/error state; we never
// fall back to fake/branded seed data.
import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';
import { API_BASE, formatPrice } from './api';

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

// ─── Raw server shapes (GET /api/mobile/challenges, /api/mobile/trips) ───────
interface RawTeam {
  id: string;
  name: string;
  capacity: number;
  captain: string | null;
  _count?: { applications?: number } | null;
}
interface RawChallenge {
  id: string;
  title: string;
  startISO: string | null;
  durationDays: number;
  categories: string[] | string | null;
  rules: string | null;
  price: number | null;
  status: 'open' | 'active' | 'archived' | string;
  teams?: RawTeam[] | null;
  _count?: { applications?: number } | null;
}
interface RawTrip {
  id: string;
  title: string;
  region: string | null;
  date: string | null;
  days: number;
  price: number | null;
  spots: number;
  difficulty: string | null;
  description: string | null;
  status: string;
  createdBy: string | null;
  _count?: { applications?: number } | null;
}

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

function applicationsOf(c: { _count?: { applications?: number } | null } | null | undefined): number {
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

function challengeStartLabel(c: RawChallenge): string {
  if (c.status === 'active') return 'идёт';
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
  // The signed-in user's own disciplinary state (server-computed).
  flags?: FlagCounts;
  eliminated?: boolean;
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
  // Server-computed disciplinary state. flags are per-category 🚩 counts;
  // eliminated freezes the member's points (🏳️ / «выбыл»).
  flags?: FlagCounts;
  eliminated?: boolean;
}

export const MEDAL_FOR_RANK = (rank: number): { icon: SFName; color: string } | null => {
  if (rank === 1) return { icon: 'crown.fill', color: '#D4AF37' };
  if (rank === 2) return { icon: 'medal.fill', color: '#A8A9AD' };
  if (rank === 3) return { icon: 'medal.fill', color: '#CD7F32' };
  return null;
};

// Live active challenge + its full team leaderboard.
export interface ActiveChallengeData { challenge: Challenge | null; members: Member[] }

const EMPTY_ACTIVE: ActiveChallengeData = { challenge: null, members: [] };

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
  currentDay?: unknown; members?: unknown; startedLabel?: unknown;
  teamRank?: unknown; teamCount?: unknown; trainer?: unknown; price?: unknown;
  tasks?: unknown; flags?: unknown; eliminated?: unknown;
}
interface RawActiveMember {
  id?: unknown; name?: unknown; weekBase?: unknown; day?: unknown; isMe?: unknown;
  flags?: unknown; eliminated?: unknown;
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
    teamName: strOf(raw.teamName),
    totalDays: numOf(raw.totalDays, 21),
    currentDay: numOf(raw.currentDay),
    members: numOf(raw.members),
    startedLabel: strOf(raw.startedLabel),
    teamRank: numOf(raw.teamRank),
    teamCount: numOf(raw.teamCount),
    trainer: strOf(raw.trainer),
    price: strOf(raw.price),
    tasks,
    flags: flagsOf(raw.flags),
    eliminated: raw.eliminated === true,
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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
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
    return { challenge, members };
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

function mapTrips(data: any): Trip[] {
  const arr: RawTrip[] = Array.isArray(data?.trips) ? data.trips : [];
  return arr.map(mapTrip);
}

export async function fetchTrips(): Promise<Trip[]> {
  return mapTrips(await getJson('/api/mobile/trips'));
}

// The server has no trip-detail endpoint — fetch the list and find by id.
export async function fetchTrip(id: string): Promise<Trip | null> {
  const trips = await fetchTrips();
  return trips.find((t) => t.id === id) ?? null;
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

function mapTeam(raw: RawTeam, index: number): ChallengeTeam {
  return {
    id: raw.id,
    name: raw.name ?? '',
    members: applicationsOf(raw),
    capacity: typeof raw.capacity === 'number' ? raw.capacity : 0,
    captain: raw.captain ?? '—',
    advisors: [],
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
  const d = await getJson('/api/mobile/challenges');
  const list: RawChallenge[] = Array.isArray(d?.challenges) ? d.challenges : [];
  return teamsFromChallenges(list);
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

function mapChallenge(raw: RawChallenge, index: number): ChallengeListItem {
  return {
    id: raw.id,
    title: raw.title ?? '',
    subtitle: categoriesText(raw.categories) || rulesSnippet(raw.rules),
    status: mapStatus(raw.status),
    startISO: raw.startISO ?? undefined,
    startLabel: challengeStartLabel(raw),
    durationDays: typeof raw.durationDays === 'number' ? raw.durationDays : 0,
    maxFlags: parseMaxFlags(raw.rules),
    participants: applicationsOf(raw),
    teams: Array.isArray(raw.teams) ? raw.teams.length : 0,
    tint: tintAt(index),
    icon: challengeIconAt(index),
  };
}

function mapChallenges(data: any): ChallengeListItem[] {
  const arr: RawChallenge[] = Array.isArray(data?.challenges) ? data.challenges : [];
  return arr.map(mapChallenge);
}

export async function fetchChallenges(): Promise<ChallengeListItem[]> {
  return mapChallenges(await getJson('/api/mobile/challenges'));
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

// No server endpoint for sport activities — return empty (screen empty state).
// DEFERRED: backend needs a sport-activities model/endpoint to populate this.
export async function fetchSport(): Promise<SportActivity[]> {
  return [];
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
  const [t, c] = await Promise.all([
    getJsonResult('/api/mobile/trips'),
    getJsonResult('/api/mobile/challenges'),
  ]);
  return {
    trips: mapTrips(t.data),
    sport: [],
    challenges: mapChallenges(c.data),
    error: !t.ok && !c.ok,
  };
}

export interface ChallengesBundle {
  challenges: ChallengeListItem[];
  teams: ChallengeTeam[];
  error: boolean;
}

export async function fetchChallengesAndTeams(): Promise<ChallengesBundle> {
  const c = await getJsonResult('/api/mobile/challenges');
  const list: RawChallenge[] = Array.isArray(c.data?.challenges) ? c.data.challenges : [];
  return {
    challenges: list.map(mapChallenge),
    teams: teamsFromChallenges(list),
    error: !c.ok,
  };
}
