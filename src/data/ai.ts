import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';

export interface CourseRef { t: string; s: string; i: SFName; c: string }

export interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  text: string;
  time: string;
  cards?: CourseRef[];
}

export const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', role: 'bot', time: '09:42', text: 'Привет, Aknazar! Видел, ты завершил тест Gallup. Strategic + Command — мощная комбинация для лидера.' },
  { id: '2', role: 'user', time: '09:43', text: 'Какие курсы посоветуешь под мой профиль?' },
  {
    id: '3', role: 'bot', time: '09:43',
    text: 'Топ-3 под Strategic для ENTJ-A:',
    cards: [
      { t: 'Лидерство', s: 'Danday Amokachi · 6 уроков', i: 'crown.fill', c: T.brand },
      { t: 'Управление талантами', s: '12 уроков · Продвинутый', i: 'puzzlepiece.fill', c: T.orange },
      { t: 'Метапрограммы', s: '9 уроков · Средний', i: 'target', c: T.green },
    ],
  },
];

export const QUICK_REPLIES = ['Книги по теме', 'Карьерный путь', 'Конфликт с командой', 'Слабости'];

// Canned, profile-aware responses for the demo assistant.
export const CANNED: Record<string, string> = {
  'Книги по теме': 'Под твой психотип Паранойял и таланты Strategic/Command рекомендую: «Принципы» Рэя Далио, «От хорошего к великому» Джима Коллинза и «Лидер на катке» Генри Клауда.',
  'Карьерный путь': 'С твоим FMD-профилем (системное мышление) и опытом HR-директора логичный следующий шаг — роль CHRO или партнёра по орг. развитию в крупной компании. Vacancy «Директор по развитию персонала» в Kaspi совпадает на 92%.',
  'Конфликт с командой': 'Опиши ситуацию — я разберу её через психотипы участников и предложу инструменты. Часто конфликт Паранойяла с Эмотивом — это про темп и прямоту коммуникации.',
  'Слабости': 'Для Паранойяла с доминантой Command зоной роста обычно становится эмпатия и делегирование. Курс «Метапрограммы» поможет лучше считывать другие фильтры восприятия.',
};
