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
}

export const TRIPS: Trip[] = [
  { id: 'kolsai', date: '5–7 февраля', title: 'Кольсайские озёра', meta: '12 идут · 8 мест', tint: '#D4E5F0', days: 3, going: 12, spots: 8, price: '85 000 ₸', organizer: 'Айгерим Болатова', organizerType: 'Гипертим · 4 поездки в Кольсай' },
  { id: 'alakol', date: '18–24 февраля', title: 'Алаколь', meta: '24 идут · 4 места', tint: '#F0E4D4', days: 7, going: 24, spots: 4, price: '140 000 ₸', organizer: 'Дамир Ахметов', organizerType: 'Паранойял · 2 поездки' },
  { id: 'srilanka', date: '15–22 марта', title: 'Шри-Ланка', meta: '8 идут · Открыт сбор', tint: '#E0F0D4', days: 8, going: 8, spots: 12, price: '690 000 ₸', organizer: 'Команда Divergents', organizerType: 'Международная поездка' },
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
