// Founder + community channels (Telegram-style). Posts live inside each channel.
import { SFName } from '../components/SFIcon';

const DANDAY_PHOTO = 'https://utfs.io/f/e23b25be-42e5-4ee4-87b6-94dcfc245071-x5cjij.jpg';
const WOMENS_PHOTO = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80';

export type ChannelAccess = 'open' | 'request';

export interface Channel {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  verified: boolean;
  baseSubscribers: number;
  bio: string;
  access: ChannelAccess;
}

export const CHANNELS: Channel[] = [
  {
    id: 'danday', handle: 'danday.amokachi', name: 'Danday Amokachi', avatar: DANDAY_PHOTO,
    verified: true, baseSubscribers: 2480, access: 'open',
    bio: 'Авторские аудио и статьи о лидерстве, мышлении и личном развитии.',
  },
  {
    id: 'womens', handle: 'womens.club', name: 'Women’s club', avatar: WOMENS_PHOTO,
    verified: true, baseSubscribers: 860, access: 'request',
    bio: 'Закрытое женское сообщество Divergents: поддержка, встречи и обсуждения. Доступ по запросу.',
  },
];

export const channelById = (id: string) => CHANNELS.find((c) => c.id === id);

export type PostType = 'audio' | 'article';

export interface ChannelPost {
  id: string;
  channelId: string;
  type: PostType;
  title: string;
  date: string;
  icon: SFName;
  cover?: string;
  audioUrl?: string;
  durationLabel?: string;
  readMins?: number;
  excerpt?: string;
  body?: string[];
  likes: number;
  views: string;
}

// NOTE: audioUrl — демонстрационные mp3. Замените на реальные записи автора.
export const CHANNEL_POSTS: ChannelPost[] = [
  { id: 'p_audio_1', channelId: 'danday', type: 'audio', title: 'Дисциплина важнее мотивации', date: 'Сегодня · 09:12', icon: 'waveform', audioUrl: 'https://download.samplelib.com/mp3/sample-15s.mp3', durationLabel: '14:20', excerpt: 'Почему ежедневные маленькие действия побеждают вспышки вдохновения.', likes: 312, views: '1.8k' },
  { id: 'p_article_1', channelId: 'danday', type: 'article', title: '5 законов лидерства Divergents', date: 'Вчера · 20:40', icon: 'doc.text.fill', cover: DANDAY_PHOTO, readMins: 6, excerpt: 'Лидерство — это не должность, а ежедневный выбор брать ответственность.', body: [
      'Лидерство начинается не с команды, а с управления самим собой. Прежде чем вести других, научитесь вести себя: режим, слово, обязательства.',
      '1. Ответственность. Лидер не ищет виноватых — он первым берёт ответственность за результат, даже когда это неудобно.',
      '2. Ясность. Люди идут за тем, кто ясно видит цель и умеет объяснить её простыми словами.',
      '3. Пример. Ваши действия говорят громче слов. Команда копирует не то, что вы говорите, а то, что вы делаете.',
      '4. Забота. Сильная команда строится на доверии. Узнавайте людей, помогайте расти, защищайте их.',
      '5. Постоянство. Большие результаты — это сумма маленьких ежедневных шагов, повторённых сотни раз.',
    ], likes: 540, views: '3.2k' },
  { id: 'p_audio_2', channelId: 'danday', type: 'audio', title: 'Как принимать сложные решения', date: '2 дня назад', icon: 'waveform', audioUrl: 'https://download.samplelib.com/mp3/sample-12s.mp3', durationLabel: '11:05', excerpt: 'Фреймворк, который убирает страх и помогает выбирать.', likes: 221, views: '1.3k' },
  { id: 'p_article_2', channelId: 'danday', type: 'article', title: 'Мышление роста: практика недели', date: '4 дня назад', icon: 'doc.text.fill', cover: DANDAY_PHOTO, readMins: 4, excerpt: 'Три упражнения, чтобы перестать бояться ошибок и начать расти.', body: [
      'Мышление роста — это убеждение, что способности развиваются через усилие и практику, а не даются от рождения.',
      'Упражнение 1. Каждый вечер записывайте одну ошибку дня и один урок из неё.',
      'Упражнение 2. Замените «я не умею» на «я пока не умею».',
      'Упражнение 3. Раз в неделю беритесь за то, что даётся трудно — там и есть рост.',
    ], likes: 168, views: '980' },
  { id: 'p_audio_3', channelId: 'danday', type: 'audio', title: 'Энергия и фокус с утра', date: 'На прошлой неделе', icon: 'waveform', audioUrl: 'https://download.samplelib.com/mp3/sample-9s.mp3', durationLabel: '08:47', excerpt: 'Утренний ритуал, который задаёт тон всему дню.', likes: 195, views: '1.1k' },

  // Women's club (доступ по запросу)
  { id: 'w_article_1', channelId: 'womens', type: 'article', title: 'Баланс: семья, дело и забота о себе', date: 'Сегодня · 11:00', icon: 'doc.text.fill', cover: WOMENS_PHOTO, readMins: 5, excerpt: 'Как не выгорать, совмещая роли — мягкие практики для женщин Divergents.', body: [
      'Забота о себе — не эгоизм, а условие, при котором у вас есть силы заботиться о других.',
      'Начните с маленького: 20 минут в день только для себя, без чувства вины.',
      'Окружение решает: женский круг поддержки помогает проходить трудные периоды легче.',
    ], likes: 142, views: '720' },
  { id: 'w_audio_1', channelId: 'womens', type: 'audio', title: 'Женская энергия и границы', date: 'Вчера', icon: 'waveform', audioUrl: 'https://download.samplelib.com/mp3/sample-12s.mp3', durationLabel: '16:30', excerpt: 'Как мягко, но твёрдо выстраивать личные границы.', likes: 98, views: '540' },
];

export const postsByChannel = (channelId: string) => CHANNEL_POSTS.filter((p) => p.channelId === channelId);
export const getPost = (id: string) => CHANNEL_POSTS.find((p) => p.id === id);
