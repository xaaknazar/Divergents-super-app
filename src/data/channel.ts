// Founder's channel — Telegram-style group "danday.amokachi": author audio + articles.
import { SFName } from '../components/SFIcon';

const DANDAY_PHOTO = 'https://utfs.io/f/e23b25be-42e5-4ee4-87b6-94dcfc245071-x5cjij.jpg';

export interface Channel {
  handle: string;
  name: string;
  avatar: string;
  verified: boolean;
  baseSubscribers: number;
  bio: string;
}

export const CHANNEL: Channel = {
  handle: 'danday.amokachi',
  name: 'Danday Amokachi',
  avatar: DANDAY_PHOTO,
  verified: true,
  baseSubscribers: 2480,
  bio: 'Основатель Divergents. Авторские аудио и статьи о лидерстве, мышлении и личном развитии.',
};

export type PostType = 'audio' | 'article';

export interface ChannelPost {
  id: string;
  type: PostType;
  title: string;
  date: string;
  icon: SFName;
  cover?: string;
  // audio
  audioUrl?: string;
  durationLabel?: string;
  // article
  readMins?: number;
  excerpt?: string;
  body?: string[];
  // engagement
  likes: number;
  views: string;
}

// NOTE: audioUrl — демонстрационные mp3. Замените на реальные записи Дандая
// (загрузка в LMS/хранилище или экспорт из Telegram).
export const CHANNEL_POSTS: ChannelPost[] = [
  {
    id: 'p_audio_1', type: 'audio', title: 'Дисциплина важнее мотивации', date: 'Сегодня · 09:12', icon: 'waveform',
    audioUrl: 'https://download.samplelib.com/mp3/sample-15s.mp3', durationLabel: '14:20',
    excerpt: 'Почему ежедневные маленькие действия побеждают вспышки вдохновения.',
    likes: 312, views: '1.8k',
  },
  {
    id: 'p_article_1', type: 'article', title: '5 законов лидерства Divergents', date: 'Вчера · 20:40', icon: 'doc.text.fill',
    cover: DANDAY_PHOTO, readMins: 6,
    excerpt: 'Лидерство — это не должность, а ежедневный выбор брать ответственность.',
    body: [
      'Лидерство начинается не с команды, а с управления самим собой. Прежде чем вести других, научитесь вести себя: режим, слово, обязательства.',
      '1. Ответственность. Лидер не ищет виноватых — он первым берёт ответственность за результат, даже когда это неудобно.',
      '2. Ясность. Люди идут за тем, кто ясно видит цель и умеет объяснить её простыми словами.',
      '3. Пример. Ваши действия говорят громче слов. Команда копирует не то, что вы говорите, а то, что вы делаете.',
      '4. Забота. Сильная команда строится на доверии. Узнавайте людей, помогайте расти, защищайте их.',
      '5. Постоянство. Большие результаты — это сумма маленьких ежедневных шагов, повторённых сотни раз.',
    ],
    likes: 540, views: '3.2k',
  },
  {
    id: 'p_audio_2', type: 'audio', title: 'Как принимать сложные решения', date: '2 дня назад', icon: 'waveform',
    audioUrl: 'https://download.samplelib.com/mp3/sample-12s.mp3', durationLabel: '11:05',
    excerpt: 'Фреймворк, который убирает страх и помогает выбирать.',
    likes: 221, views: '1.3k',
  },
  {
    id: 'p_article_2', type: 'article', title: 'Мышление роста: практика недели', date: '4 дня назад', icon: 'doc.text.fill',
    cover: DANDAY_PHOTO, readMins: 4,
    excerpt: 'Три упражнения, чтобы перестать бояться ошибок и начать расти.',
    body: [
      'Мышление роста — это убеждение, что способности развиваются через усилие и практику, а не даются от рождения.',
      'Упражнение 1. Каждый вечер записывайте одну ошибку дня и один урок из неё. Через месяц вы увидите, как страх ошибок сменяется любопытством.',
      'Упражнение 2. Замените «я не умею» на «я пока не умею». Маленькое слово «пока» меняет всё отношение к задаче.',
      'Упражнение 3. Раз в неделю беритесь за то, что даётся трудно. Именно зона дискомфорта — место настоящего роста.',
    ],
    likes: 168, views: '980',
  },
  {
    id: 'p_audio_3', type: 'audio', title: 'Энергия и фокус с утра', date: 'На прошлой неделе', icon: 'waveform',
    audioUrl: 'https://download.samplelib.com/mp3/sample-9s.mp3', durationLabel: '08:47',
    excerpt: 'Утренний ритуал, который задаёт тон всему дню.',
    likes: 195, views: '1.1k',
  },
];

export const getPost = (id: string) => CHANNEL_POSTS.find((p) => p.id === id);
