// Mock LMS data. The catalog mirrors Divergents' real 19-course platform
// (subset detailed here). The "Лидерство" course has full lessons for the
// deep course-detail / video flow.
import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';

export interface Lesson {
  id: string;
  n: number;
  title: string;
  duration: string; // e.g. "26 мин · Видео"
  minutes: number;
  // Populated for live courses fetched from the website API:
  isFree?: boolean;
  playbackId?: string | null;
  hlsUrl?: string | null;
  description?: string | null;
}

export interface Course {
  id: string;
  title: string;
  author: string;
  level?: string;
  durationLabel?: string;
  lessonsLabel: string;
  rating?: string;
  students?: string;
  match?: number;          // % fit to the user's profile (mock only)
  icon: SFName;
  tint: string;
  iconColor: string;
  category: string;
  description: string;
  lessons: Lesson[];
  // Live-data fields (from the website API):
  imageUrl?: string | null;   // UploadThing cover URL
  price?: number | null;      // course price in ₸; 0/null = free
  chaptersCount?: number;     // published chapters count
  source?: 'live' | 'mock';
  serverProgress?: number; // 0..100 from the website (owned courses)
}

export const COURSES: Course[] = [
  {
    id: 'leadership',
    title: 'Лидерство',
    author: 'Danday Amokachi',
    level: 'Продвинутый',
    durationLabel: '2ч 30м',
    lessonsLabel: '6 уроков',
    rating: '4.9',
    students: '847',
    match: 96,
    icon: 'crown.fill',
    tint: '#E8ECFB',
    iconColor: T.brand,
    category: 'Лидерство',
    description:
      '6-урочный практический курс по основам лидерства от Danday Amokachi. ' +
      'Разбираем 5 законов и применяем их в реальных кейсах из казахстанских компаний.',
    lessons: [
      { id: 'l1', n: 1, title: 'Определение лидерства', duration: '22 мин · Видео', minutes: 22 },
      { id: 'l2', n: 2, title: 'Определение лидерства 2', duration: '28 мин · Видео', minutes: 28 },
      { id: 'l3', n: 3, title: 'Законы лидерства', duration: '24 мин · Видео', minutes: 24 },
      { id: 'l4', n: 4, title: 'Законы лидерства 2', duration: '26 мин · Видео', minutes: 26 },
      { id: 'l5', n: 5, title: 'Лайфхаки лидерства', duration: '20 мин · Видео', minutes: 20 },
      { id: 'l6', n: 6, title: 'Формирование команд', duration: '30 мин · Видео', minutes: 30 },
    ],
  },
  {
    id: 'gallup-max',
    title: 'Максимизация талантов Gallup',
    author: 'Команда Divergents',
    level: 'Продвинутый',
    durationLabel: '4ч 20м',
    lessonsLabel: '12 уроков',
    rating: '4.8',
    students: '1.2k',
    match: 92,
    icon: 'target',
    tint: '#E1E7F8',
    iconColor: T.brandAccent,
    category: 'Психометрия',
    description:
      'Глубокое изучение всех 34 талантов теста Gallup. Подходит всем, кто хочет ' +
      'раскрыть свой потенциал и научиться применять сильные стороны на практике.',
    lessons: Array.from({ length: 12 }, (_, i) => ({
      id: `g${i + 1}`, n: i + 1, title: `Тема ${i + 1}`, duration: '20 мин · Видео', minutes: 20,
    })),
  },
  {
    id: 'psychotypes',
    title: 'Психотипы: 8 ключевых типов',
    author: 'Аида Сейтхан',
    level: 'Базовый',
    durationLabel: '5ч 10м',
    lessonsLabel: '14 уроков',
    rating: '4.7',
    students: '2.1k',
    match: 88,
    icon: 'brain.head.profile',
    tint: '#E5DCEC',
    iconColor: T.purple,
    category: 'Психометрия',
    description:
      'Разбираемся в восьми ключевых психотипах: Паранойял, Эпилептоид, Истероид, ' +
      'Гипертим, Шизоид, Психастеноид, Эмотив и Депрессивный.',
    lessons: Array.from({ length: 14 }, (_, i) => ({
      id: `p${i + 1}`, n: i + 1, title: `Психотип ${i + 1}`, duration: '22 мин · Видео', minutes: 22,
    })),
  },
  {
    id: 'talent-mgmt',
    title: 'Управление талантами',
    author: 'Динара Ахметова',
    level: 'Продвинутый',
    durationLabel: '3ч 50м',
    lessonsLabel: '12 уроков',
    rating: '4.6',
    students: '654',
    match: 84,
    icon: 'puzzlepiece.fill',
    tint: '#FEEAD0',
    iconColor: T.orange,
    category: 'Управление',
    description: 'Курс для управленцев высшего звена: модели поведения, психометрия и развитие команд.',
    lessons: Array.from({ length: 12 }, (_, i) => ({
      id: `tm${i + 1}`, n: i + 1, title: `Модуль ${i + 1}`, duration: '19 мин · Видео', minutes: 19,
    })),
  },
  {
    id: 'metaprograms',
    title: 'Метапрограммы',
    author: 'Айгуль Касенова',
    level: 'Средний',
    durationLabel: '2ч 40м',
    lessonsLabel: '9 уроков',
    rating: '4.5',
    students: '412',
    match: 76,
    icon: 'target',
    tint: '#DEF0DF',
    iconColor: T.green,
    category: 'Психометрия',
    description: 'Базовые фильтры восприятия и их влияние на мышление и поведение.',
    lessons: Array.from({ length: 9 }, (_, i) => ({
      id: `mp${i + 1}`, n: i + 1, title: `Фильтр ${i + 1}`, duration: '18 мин · Видео', minutes: 18,
    })),
  },
  {
    id: 'gallup-marriage',
    title: 'Брак через призму Gallup',
    author: 'Айгерим Болатова',
    level: 'Средний',
    durationLabel: '2ч 50м',
    lessonsLabel: '8 уроков',
    rating: '4.8',
    students: '328',
    match: 64,
    icon: 'heart.text.square.fill',
    tint: '#FCE2E2',
    iconColor: T.red,
    category: 'Семья',
    description: 'Как таланты Gallup проявляются в браке и влияют на поведение, ожидания и конфликты.',
    lessons: Array.from({ length: 8 }, (_, i) => ({
      id: `gm${i + 1}`, n: i + 1, title: `Урок ${i + 1}`, duration: '21 мин · Видео', minutes: 21,
    })),
  },
];

export const CATALOG_CATEGORIES = ['Под профиль', 'Психометрия', 'Лидерство', 'Управление', 'Семья'] as const;

export const CATALOG_TOPICS: { icon: SFName; bg: string; title: string; detail: string }[] = [
  { icon: 'brain.head.profile', bg: T.purple, title: 'Психометрия', detail: '6 курсов' },
  { icon: 'crown.fill', bg: T.brand, title: 'Лидерство', detail: '4 курса' },
  { icon: 'puzzlepiece.fill', bg: T.orange, title: 'Управление', detail: '5 курсов' },
  { icon: 'heart.text.square.fill', bg: T.red, title: 'Семья и отношения', detail: '3 курса' },
  { icon: 'figure.walk', bg: T.green, title: 'Карьера', detail: '2 курса' },
];

export const getCourse = (id: string) => COURSES.find((c) => c.id === id);
