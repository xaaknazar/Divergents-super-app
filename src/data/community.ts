// Mock community data: the live 21-day challenge, trips, members, leaderboard.
import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';

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

// Bonus over the minimum rolls up to the team — exactly the mechanic the user
// refined in the design chat.
export const INITIAL_CHALLENGE: Challenge = {
  id: 'no-sugar-21',
  title: '21 день без сахара',
  teamName: 'Алматы Барсы',
  totalDays: 21,
  currentDay: 12,
  members: 16,
  startedLabel: 'стартовали 10 января',
  teamRank: 2,
  teamCount: 16,
  trainer: 'Аида Сейтхан',
  price: '12 000 ₸',
  tasks: [
    { id: 'steps', kind: 'metric', title: '10 000 шагов', icon: 'figure.walk', unit: 'шагов', min: 10000, current: 13240, basePts: 10, unitSize: 100, ptsPerUnit: 1 },
    { id: 'sugar', kind: 'binary', title: 'День без сахара', icon: 'tag.fill', done: true, basePts: 10 },
    { id: 'reading', kind: 'metric', title: '10 страниц книги', icon: 'book.fill', unit: 'стр.', min: 10, current: 6, basePts: 10, unitSize: 1, ptsPerUnit: 2 },
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

export const TEAM_MEMBERS: Member[] = [
  { id: 'm1', name: 'Айгерим Б.', weekBase: 412, day: 18 },
  { id: 'me', name: 'Aknazar K.', weekBase: 316, day: 12, isMe: true },
  { id: 'm3', name: 'Дамир А.', weekBase: 312, day: 11 },
  { id: 'm4', name: 'Жанар К.', weekBase: 287, day: 10 },
  { id: 'm5', name: 'Олжас Т.', weekBase: 245, day: 9 },
];

export const MEDAL_FOR_RANK = (rank: number): { icon: SFName; color: string } | null => {
  if (rank === 1) return { icon: 'crown.fill', color: '#D4AF37' };
  if (rank === 2) return { icon: 'medal.fill', color: '#A8A9AD' };
  if (rank === 3) return { icon: 'medal.fill', color: '#CD7F32' };
  return null;
};

export interface Trip {
  id: string;
  date: string;
  title: string;
  meta: string;
  tint: string;
  days: number;
  going: number;
  spots: number;
  price: string;
  organizer: string;
  organizerType: string;
  imageUrl?: string | null; // real photo URL (UploadThing/web); falls back to gradient
}

export const TRIPS: Trip[] = [
  { id: 'kolsai', date: '5–7 февраля', title: 'Кольсайские озёра', meta: '12 идут · 8 мест', tint: '#D4E5F0', days: 3, going: 12, spots: 8, price: '85 000 ₸', organizer: 'Айгерим Болатова', organizerType: 'Гипертим · 4 поездки в Кольсай', imageUrl: 'https://jllxvk4wcx.ufs.sh/f/B1isCLwBCS2pYmkZsauSfwFVCcqZrDJOYvtM734Kxb0T29Le' },
  { id: 'alakol', date: '18–24 февраля', title: 'Алаколь', meta: '24 идут · 4 места', tint: '#F0E4D4', days: 7, going: 24, spots: 4, price: '140 000 ₸', organizer: 'Дамир Ахметов', organizerType: 'Паранойял · 2 поездки', imageUrl: 'https://jllxvk4wcx.ufs.sh/f/B1isCLwBCS2pccwFts9j5azL0JSPdxV1RUqoZHK2TBFCGt6I' },
  { id: 'srilanka', date: '15–22 марта', title: 'Шри-Ланка', meta: '8 идут · Открыт сбор', tint: '#E0F0D4', days: 8, going: 8, spots: 12, price: '690 000 ₸', organizer: 'Команда Divergents', organizerType: 'Международная поездка', imageUrl: 'https://jllxvk4wcx.ufs.sh/f/B1isCLwBCS2p8rSdIhgcGzNkP3Qp1tJFou5WlXa46ynLUReC' },
];

export const getTrip = (id: string) => TRIPS.find((t) => t.id === id);

export interface CommunityMember {
  id: string;
  name: string;
  role: string;
  initial: string;
  psychotype: string;
  level: number;
  stats: { courses: number; books: number; challenges: number };
  talents: string[];
}

export const FEATURED_MEMBER: CommunityMember = {
  id: 'ainur',
  name: 'Айнур Касымова',
  role: 'Маркетолог · Астана',
  initial: 'А',
  psychotype: 'Гипертим',
  level: 11,
  stats: { courses: 14, books: 52, challenges: 8 },
  talents: ['Communication', 'Woo', 'Positivity', 'Strategic', 'Activator'],
};

// ─────────────────────────────────────────────────────────────
// Divergents Challenge — real 30-day rules
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
  { key: 'NS', title: 'No Sugar', norm: 'Полностью без сахара', scoring: 'Читмил: 2 ч.л. мёда + 1 финик в день', icon: 'tag.fill', color: T.red },
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

export interface ChallengeTeam {
  id: string;
  name: string;
  members: number;
  capacity: number;
  captain: string;
  advisors: string[];
  tint: string;
}

export const CHALLENGE_TEAMS: ChallengeTeam[] = [
  { id: 't1', name: 'Алматы Барсы', members: 30, capacity: 30, captain: 'Айгерим Б.', advisors: ['Дамир А.', 'Жанар К.'], tint: '#E6ECFB' },
  { id: 't2', name: 'Astana Wolves', members: 27, capacity: 30, captain: 'Олжас Т.', advisors: ['Санжар К.', 'Аружан М.'], tint: '#FDE7D9' },
  { id: 't3', name: 'Көкше Тигр', members: 22, capacity: 30, captain: 'Ерлан С.', advisors: ['Мадина Е.'], tint: '#E0F0DA' },
  { id: 't4', name: 'Shymkent Lions', members: 18, capacity: 30, captain: 'Нурлан Б.', advisors: ['Аян Т.'], tint: '#F0E2F2' },
];

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

export const CHALLENGES: ChallengeListItem[] = [
  {
    id: '21days', title: '21 Days Challenge', subtitle: 'Чтение · No Sugar · Активность',
    status: 'upcoming', startISO: '2026-08-15', startLabel: '15 августа', durationDays: 21,
    maxFlags: 3, participants: 128, teams: CHALLENGE_TEAMS.length, tint: '#E6ECFB', icon: 'flame.fill',
  },
  {
    id: 'no-sugar-21', title: '21 день без сахара', subtitle: 'Демо · ежедневный трекер баллов',
    status: 'active', startLabel: 'идёт · день 12', durationDays: 21,
    maxFlags: 3, participants: 16, teams: 1, tint: '#FDE7D9', icon: 'tag.fill',
  },
];

export const getChallengeMeta = (id: string) => CHALLENGES.find((c) => c.id === id);

export function daysUntil(iso?: string): number {
  if (!iso) return 0;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

export function teamsNeed(): number {
  return CHALLENGE_TEAMS.reduce((s, t) => s + Math.max(0, t.capacity - t.members), 0);
}
