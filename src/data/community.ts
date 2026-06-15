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
    { id: 'sugar', kind: 'binary', title: 'День без сахара', icon: 'cube.fill', done: true, basePts: 10 },
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

export const TRIPS: Trip[] = [
  {
    id: 'kolsai', title: 'Кольсайские озёра', region: 'Алматинская область · 300 км',
    date: '11–13 июля', days: 3, going: 14, spots: 6, price: '95 000 ₸', difficulty: 'Средняя',
    meta: '14 идут · 6 мест', tint: '#D4E5F0',
    organizer: 'Айгерим Болатова', organizerType: 'Гипертим · 4 поездки в Кольсай',
    description: 'Система из трёх горных озёр в Кунгей-Алатау на высоте 1800–2800 м. В программе — Кольсайские озёра и озеро Каинды с затопленным еловым лесом. Треккинг средней сложности, ночёвки в гостевом доме в селе Саты.',
    itinerary: [
      { day: 'День 1', title: 'Алматы → Саты', note: 'Выезд 7:00 · ~300 км · первое Кольсайское озеро', icon: 'mappin.circle.fill', color: T.brand },
      { day: 'День 2', title: 'Каинды + второе озеро', note: 'Затопленный лес и треккинг ~10 км', icon: 'figure.walk', color: T.green },
      { day: 'День 3', title: 'Возвращение', note: 'Завтрак в Саты · выезд в Алматы 10:00', icon: 'house.fill', color: T.orange },
    ],
    included: [
      { icon: 'cart.fill', t: 'Трансфер Алматы ⇄ Саты' },
      { icon: 'house.fill', t: '2 ночи в гостевом доме' },
      { icon: 'leaf.fill', t: 'Питание + эко-сборы нацпарка' },
      { icon: 'figure.walk', t: 'Гид и сопровождение' },
    ],
    imageUrl: 'https://jllxvk4wcx.ufs.sh/f/B1isCLwBCS2pYmkZsauSfwFVCcqZrDJOYvtM734Kxb0T29Le',
  },
  {
    id: 'alakol', title: 'Алаколь', region: 'Восток КЗ · озеро · 560 км',
    date: '2–6 августа', days: 5, going: 22, spots: 8, price: '150 000 ₸', difficulty: 'Лёгкая',
    meta: '22 идут · 8 мест', tint: '#F0E4D4',
    organizer: 'Дамир Ахметов', organizerType: 'Паранойял · 2 поездки',
    description: 'Солёное озеро с лечебной чёрной галькой и минерализованной водой. Пляжный отдых на берегу в посёлке Акши: купание, прогулки на катере, закаты. Подходит для семей и спокойного восстановления.',
    itinerary: [
      { day: 'День 1', title: 'Переезд до Акши', note: 'Алматы → Ушарал → база на берегу', icon: 'cart.fill', color: T.brand },
      { day: 'Дни 2–4', title: 'Пляж и озеро', note: 'Купание, чёрная галька, катер, закаты', icon: 'leaf.fill', color: T.green },
      { day: 'День 5', title: 'Возвращение', note: 'Сборы и выезд в Алматы', icon: 'house.fill', color: T.orange },
    ],
    included: [
      { icon: 'cart.fill', t: 'Трансфер до Алаколя и обратно' },
      { icon: 'house.fill', t: '4 ночи у самого берега' },
      { icon: 'leaf.fill', t: 'Завтраки и пляжная зона' },
      { icon: 'person.3.fill', t: 'Куратор группы' },
    ],
    imageUrl: 'https://jllxvk4wcx.ufs.sh/f/B1isCLwBCS2pccwFts9j5azL0JSPdxV1RUqoZHK2TBFCGt6I',
  },
  {
    id: 'srilanka', title: 'Шри-Ланка', region: 'Международная · 9 дней',
    date: '12–20 сентября', days: 9, going: 11, spots: 9, price: '780 000 ₸', difficulty: 'Лёгкая',
    meta: '11 идут · 9 мест', tint: '#E0F0D4',
    organizer: 'Команда Divergents', organizerType: 'Международная поездка сообщества',
    description: 'Девятидневное путешествие по острову: Канди и храм Зуба Будды, чайные плантации Эллы, сафари в нацпарке Яла и океанские пляжи Мириссы. Тёплый океан, культура и природа в кругу «своих».',
    itinerary: [
      { day: 'Дни 1–2', title: 'Коломбо → Канди', note: 'Прилёт, переезд, храм Зуба Будды', icon: 'globe', color: T.brand },
      { day: 'Дни 3–4', title: 'Элла', note: 'Чайные плантации, девятиарочный мост', icon: 'leaf.fill', color: T.green },
      { day: 'Дни 5–6', title: 'Сафари Яла', note: 'Леопарды, слоны, джип-сафари', icon: 'figure.walk', color: T.orange },
      { day: 'Дни 7–9', title: 'Мирисса · океан', note: 'Пляжи, киты (сезон), вылет домой', icon: 'mappin.circle.fill', color: T.purple },
    ],
    included: [
      { icon: 'globe', t: 'Авиаперелёт и трансферы' },
      { icon: 'house.fill', t: '8 ночей в отелях' },
      { icon: 'cart.fill', t: 'Джип-сафари в Яле' },
      { icon: 'leaf.fill', t: 'Завтраки и гид' },
    ],
    imageUrl: 'https://jllxvk4wcx.ufs.sh/f/B1isCLwBCS2p8rSdIhgcGzNkP3Qp1tJFou5WlXa46ynLUReC',
  },
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

export const SPORT: SportActivity[] = [
  { id: 'football', title: 'Футбол 5×5', place: 'Almaty Arena', date: 'Каждую среду · 20:00', icon: 'soccerball', going: 14, spotsLabel: '6 мест', tint: '#E0F0DA' },
  { id: 'tennis', title: 'Большой теннис', place: 'Esentai Tennis Club', date: 'Суббота · 10:00', icon: 'tennis.racket', going: 6, spotsLabel: '2 места', tint: '#E6ECFB' },
  { id: 'marathon', title: 'Полумарафон 21 км', place: 'Парк Первого Президента', date: '7 сентября · 8:00', icon: 'figure.walk', going: 38, spotsLabel: 'Открыт сбор', tint: '#FDE7D9' },
  { id: 'yoga', title: 'Йога на рассвете', place: 'Кок-Тобе', date: 'Воскресенье · 6:30', icon: 'figure.mind.and.body', going: 12, spotsLabel: '8 мест', tint: '#F0E2F2' },
];

// ─── Встречи: онлайн-лекции Дандай Амокачи ─────────────────────────
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

const DANDAY_PHOTO = 'https://utfs.io/f/e23b25be-42e5-4ee4-87b6-94dcfc245071-x5cjij.jpg';

export const LECTURES: Lecture[] = [
  { id: 'lec1', title: 'Законы лидерства', speaker: 'Дандай Амокачи', date: 'Сегодня · 19:00', durationLabel: '90 мин', live: true, seatsLabel: '124 смотрят', imageUrl: DANDAY_PHOTO },
  { id: 'lec2', title: 'Формирование команды', speaker: 'Дандай Амокачи', date: '25 июня · 19:00', durationLabel: '90 мин', live: false, seatsLabel: 'Открыта запись', imageUrl: DANDAY_PHOTO },
  { id: 'lec3', title: 'Лайфхаки лидерства', speaker: 'Дандай Амокачи', date: '2 июля · 19:00', durationLabel: '75 мин', live: false, seatsLabel: 'Открыта запись', imageUrl: DANDAY_PHOTO },
];
