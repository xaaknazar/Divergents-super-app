import type { Meta, StoryObj } from '@storybook/react-native';
import { individualReadingFixture } from '../storybook/readingFixtures';
import { ReadingChallengeContent, ReadingBookInput } from './ReadingChallengeContent';
const noop = () => {};
const book: ReadingBookInput = { title: 'Атомные привычки', author: 'Джеймс Клир', status: 'verified',
  verified: { title: 'Атомные привычки', author: 'Джеймс Клир' }, suggestions: [], pick: noop, reject: noop, manual: noop, setTitle: noop, setAuthor: noop, check: noop, edit: noop };
const session = { id: 's1', deviceId: 'd1', day: 14, book: 'Атомные привычки', author: 'Джеймс Клир', budgetMs: 36_000_000,
  startedAt: '2026-10-20T08:00:00Z', elapsedMs: 18 * 60000, status: 'running' as const };
const meta = { title: 'Reading/Challenge', component: ReadingChallengeContent,
  args: { data: individualReadingFixture, remainingMs: 42 * 60000, timerState: 'ready', protection: 'ready', busy: false,
    awaitingPages: false, needsRecovery: false, book, onPrepare: noop, onStart: noop, onPause: noop, onReport: noop, onSaveApproach: noop,
    onJoin: noop, onRetry: noop, onRecover: noop, onRanking: noop, onHistory: noop },
  parameters: { canvasLayout: 'content', docs: { description: { component:
    'Несохранённые страницы — первым обязательным шагом. Далее: таймер → действия или статус подхода → «Что читаете» → «Сегодня» → «Мой рейтинг» → «Мои книги и история» → правила. Пауза непосредственно под таймером. Порядок одинаковый в обеих темах и при крупном шрифте.' } } },
} satisfies Meta<typeof ReadingChallengeContent>;
export default meta;
type Story = StoryObj<typeof meta>;
const fresh = { ...individualReadingFixture, me: { ...individualReadingFixture.me!, history: [{ day: 14, state: 'open' as const, pages: 0, elapsedMs: 0 }] } };
/** Вступление: блок челленджа, правила, галочка, «Присоединиться». */
export const Join: Story = { args: { data: { ...individualReadingFixture, membership: null, me: null } } };
export const JoinDark: Story = { args: { data: { ...individualReadingFixture, membership: null, me: null } }, parameters: { scheme: 'dark' } };
/** Старт: таймер на 60:00, книга не написана. */
export const StartNoBook: Story = { args: { data: fresh, remainingMs: 3_600_000, book: { ...book, title: '', author: '', status: 'empty', verified: null } } };
export const StartBookSuggested: Story = { args: { data: fresh, remainingMs: 3_600_000, book: { ...book, title: 'атомные привычки', author: '', status: 'suggested', verified: null,
  suggestions: [{ title: 'Атомные привычки', author: 'Джеймс Клир' }, { title: 'Атомные привычки. Рабочая тетрадь', author: 'Джеймс Клир' }] } } };
export const StartBookManual: Story = { args: { data: fresh, remainingMs: 3_600_000, book: { ...book, title: 'Моя редкая книга', author: 'Местный автор', status: 'verified',
  verified: { title: 'Моя редкая книга', author: 'Местный автор', manual: true } } } };
export const StartBookNotFound: Story = { args: { data: fresh, remainingMs: 3_600_000, book: { ...book, title: 'Моя редкая книга', author: 'Местный автор', status: 'notFound', verified: null } } };
/** Готов к чтению: «Старт» под таймером, книга ниже; рейтинг непосредственно перед историей. */
export const StartReady: Story = { args: { data: fresh, remainingMs: 3_600_000 } };
/** Идёт чтение: «Пауза» сразу под таймером, затем заблокированная карточка текущей книги. */
export const Running: Story = { args: { timerState: 'running', data: { ...individualReadingFixture, session } }, parameters: { reduceMotion: false } };
export const Overtime: Story = { args: { timerState: 'running', remainingMs: -754000, data: { ...individualReadingFixture, session,
  me: { ...individualReadingFixture.me!, history: [{ day: 14, state: 'complete', pages: 30, elapsedMs: 61 * 60000 }] } } }, parameters: { scheme: 'dark' } };
/** Пауза не требует страниц: можно продолжить или явно сохранить короткий подход. */
export const PausedBeforeGoal: Story = { args: { timerState: 'paused', resumableSession: true, canResume: true, onResume: noop,
  data: { ...individualReadingFixture, session } } };
export const PausedPages: Story = { args: { timerState: 'paused', remainingMs: 0, resumableSession: true, canResume: true, onResume: noop,
  data: { ...individualReadingFixture, session: { ...session, elapsedMs: 3_600_000 } } } };
export const Saving: Story = { args: { timerState: 'paused', awaitingPages: true, busy: true, data: { ...individualReadingFixture, session: { ...session, status: 'awaiting_pages' as const } } } };
/** После первого подхода: «Новый подход» и статус сохранения. */
export const ResumeAfterApproach: Story = {};
export const RequiredPagesDark: Story = { args: { timerState: 'paused', remainingMs: 0, awaitingPages: true,
  data: { ...individualReadingFixture, session: { ...session, status: 'awaiting_pages' as const, elapsedMs: 3_600_000 } } }, parameters: { scheme: 'dark' } };
export const RequiredPagesLargeText: Story = { ...RequiredPagesDark, parameters: { viewport: 'compact', textSize: 'xl' } };
export const GoalDone: Story = { args: { timerState: 'complete', remainingMs: 0, data: { ...individualReadingFixture,
  me: { ...individualReadingFixture.me!, history: [{ day: 14, state: 'complete', pages: 40, elapsedMs: 72 * 60000 }] } } } };
export const FirstDayRanked: Story = { args: { data: { ...individualReadingFixture, me: { ...individualReadingFixture.ranking[3], userId: 'demo-reader' }, ranking: individualReadingFixture.ranking.map(m => m.userId === 'r4' ? { ...m, userId: 'demo-reader' } : m.userId === 'demo-reader' ? { ...m, userId: 'other' } : m) } } };
export const Permission: Story = { args: { protection: 'permission' } };
export const Unsupported: Story = { args: { protection: 'unavailable' } };
export const Recovery: Story = { args: { needsRecovery: true, timerState: 'paused' } };
/** Ответ на «Старт» потерялся, сервер подход уже принял: продолжить тем же подходом или отменить без времени. */
export const StartRecovery: Story = { args: { startRecovery: true, onContinueStart: noop, timerState: 'paused',
  data: { ...individualReadingFixture, session: { ...session, elapsedMs: null } } } };
export const StartRecoveryDark: Story = { ...StartRecovery, parameters: { scheme: 'dark' } };
export const StartRecoveryLargeText: Story = { ...StartRecovery, parameters: { viewport: 'compact', textSize: 'xl' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const MultipleBooksToday: Story = { args: { timerState: 'complete', remainingMs: 0,
  data: { ...individualReadingFixture, todayBooks: [
    { key: 'ol:OL1W', title: 'Атомные привычки', author: 'Джеймс Клир', coverId: null, pages: 15, elapsedMs: 25 * 60000, nextPage: null },
    { key: 'ol:OL2W', title: 'Пять уровней лидерства', author: 'Джон Максвелл', coverId: null, pages: 20, elapsedMs: 35 * 60000, nextPage: null },
  ], me: { ...individualReadingFixture.me!, history: [{ day: 14, state: 'complete', pages: 35, elapsedMs: 60 * 60000 }] } },
  library: { busy: false, retry: noop, select: noop, books: [
    { key: 'ol:OL1W', title: 'Атомные привычки', author: 'Джеймс Клир', coverId: null, pages: 15, elapsedMs: 25 * 60000, nextPage: null },
    { key: 'ol:OL2W', title: 'Пять уровней лидерства', author: 'Джон Максвелл', coverId: null, pages: 20, elapsedMs: 35 * 60000, nextPage: null },
  ] } } };

/** Как в приложении с iOS 99: полка книг и разрешённые читалки. Книга выбирается в одном блоке «Что читаете». */
const shelfBooks = [
  { key: 'ol:OL1W', title: 'Атомные привычки', author: 'Джеймс Клир', coverId: null, pages: 96, elapsedMs: 5 * 3_600_000, nextPage: 97 },
  { key: 'ol:OL2W', title: 'Пять уровней лидерства', author: 'Джон Максвелл', coverId: null, pages: 40, elapsedMs: 2 * 3_600_000, nextPage: 41 },
];
const shelfArgs = {
  book: { ...book, verified: { ...book.verified!, key: 'ol:OL1W' } },
  library: { busy: false, retry: noop, select: noop, books: shelfBooks },
  composer: { draft: { ...book, title: '', author: '', status: 'empty' as const, verified: null }, supported: true, adding: false, reset: noop, save: async () => false },
  allowedApps: { count: 1, editable: true, busy: false, needsReselection: false, choose: noop },
};
const shelfToday = { ...individualReadingFixture, todayBooks: [{ ...shelfBooks[0], pages: 12, elapsedMs: 18 * 60000 }],
  me: { ...individualReadingFixture.me!, flagRecovery: { requiredDays: 5, progressDays: 3, daysRemaining: 2, earnedFlags: 1, forgivenFlags: 0 } } };
export const ShelfSaved: Story = { args: { ...shelfArgs, data: shelfToday } };
export const ShelfSavedDark: Story = { ...ShelfSaved, parameters: { scheme: 'dark' } };
export const ShelfSavedLargeText: Story = { ...ShelfSaved, parameters: { viewport: 'compact', textSize: 'xl' } };
export const ShelfRunning: Story = { args: { ...shelfArgs, timerState: 'running', data: { ...shelfToday, session: { ...session, bookKey: 'ol:OL1W' } } } };
export const ShelfPages: Story = { args: { ...shelfArgs, timerState: 'paused', remainingMs: 0, awaitingPages: true,
  data: { ...shelfToday, session: { ...session, bookKey: 'ol:OL1W', status: 'awaiting_pages' as const, elapsedMs: 3_600_000 } } } };
