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
  parameters: { canvasLayout: 'content' },
} satisfies Meta<typeof ReadingChallengeContent>;
export default meta;
type Story = StoryObj<typeof meta>;
const fresh = { ...individualReadingFixture, me: { ...individualReadingFixture.me!, history: [{ day: 14, state: 'open' as const, pages: 0, elapsedMs: 0 }] } };
/** Вступление: блок челленджа, 9 правил, галочка, «Присоединиться». */
export const Join: Story = { args: { data: { ...individualReadingFixture, membership: null, me: null } } };
export const JoinDark: Story = { args: { data: { ...individualReadingFixture, membership: null, me: null } }, parameters: { scheme: 'dark' } };
/** Старт: таймер на 60:00, книга не написана. */
export const StartNoBook: Story = { args: { data: fresh, remainingMs: 3_600_000, book: { ...book, title: '', author: '', status: 'empty', verified: null } } };
export const StartBookSuggested: Story = { args: { data: fresh, remainingMs: 3_600_000, book: { ...book, title: 'атомные привычки', author: '', status: 'suggested', verified: null,
  suggestions: [{ title: 'Атомные привычки', author: 'Джеймс Клир' }, { title: 'Атомные привычки. Рабочая тетрадь', author: 'Джеймс Клир' }] } } };
export const StartBookManual: Story = { args: { data: fresh, remainingMs: 3_600_000, book: { ...book, title: 'Моя редкая книга', author: 'Местный автор', status: 'verified',
  verified: { title: 'Моя редкая книга', author: 'Местный автор', manual: true } } } };
export const StartBookNotFound: Story = { args: { data: fresh, remainingMs: 3_600_000, book: { ...book, title: 'Моя редкая книга', author: 'Местный автор', status: 'notFound', verified: null } } };
export const StartReady: Story = { args: { data: fresh, remainingMs: 3_600_000 } };
export const Running: Story = { args: { timerState: 'running', data: { ...individualReadingFixture, session } }, parameters: { reduceMotion: false } };
export const Overtime: Story = { args: { timerState: 'running', remainingMs: -754000, data: { ...individualReadingFixture, session,
  me: { ...individualReadingFixture.me!, history: [{ day: 14, state: 'complete', pages: 30, elapsedMs: 61 * 60000 }] } } }, parameters: { scheme: 'dark' } };
/** Пауза: страницы за подход и «Возобновить». */
export const PausedPages: Story = { args: { timerState: 'paused', resumableSession: true, canResume: true, onResume: noop,
  data: { ...individualReadingFixture, session } } };
export const Saving: Story = { args: { timerState: 'paused', awaitingPages: true, busy: true, data: { ...individualReadingFixture, session: { ...session, status: 'awaiting_pages' as const } } } };
/** После первого подхода: «Возобновить» и статус сохранения. */
export const ResumeAfterApproach: Story = {};
export const GoalDone: Story = { args: { timerState: 'complete', remainingMs: 0, data: { ...individualReadingFixture,
  me: { ...individualReadingFixture.me!, history: [{ day: 14, state: 'complete', pages: 40, elapsedMs: 72 * 60000 }] } } } };
export const Review: Story = { args: { data: { ...individualReadingFixture,
  me: { ...individualReadingFixture.me!, history: [{ day: 14, state: 'review', pages: 10, elapsedMs: 20 * 60000 }] } } } };
export const Qualifying: Story = { args: { data: { ...individualReadingFixture, me: { ...individualReadingFixture.ranking[3], userId: 'demo-reader' }, ranking: individualReadingFixture.ranking.map(m => m.userId === 'r4' ? { ...m, userId: 'demo-reader' } : m.userId === 'demo-reader' ? { ...m, userId: 'other' } : m) } } };
export const Permission: Story = { args: { protection: 'permission' } };
export const Unsupported: Story = { args: { protection: 'unavailable' } };
export const Recovery: Story = { args: { needsRecovery: true, timerState: 'paused' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
