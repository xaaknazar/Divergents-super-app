import type { Meta, StoryObj } from '@storybook/react-native';
import { readingFixture, continuousReadingFixture } from '../storybook/readingFixtures';
import { ReadingChallengeContent } from './ReadingChallengeContent';
const meta = { title: 'Reading/Challenge', component: ReadingChallengeContent,
  args: { data: readingFixture, remainingMs: 2400000, timerState: 'ready', protection: 'ready', busy: false,
    awaitingPages: false, needsRecovery: false, onPrepare: () => {}, onStart: () => {}, onPause: () => {},
    onReport: () => {}, onJoin: () => {}, onApplications: () => {}, onRetry: () => {}, onRecover: () => {}, onResolve: () => {} },
  parameters: { canvasLayout: 'content' },
} satisfies Meta<typeof ReadingChallengeContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Running: Story = { args: { timerState: 'running' }, parameters: { reduceMotion: false } };
export const Overtime: Story = { args: { timerState: 'running', remainingMs: -925000 }, parameters: { scheme: 'dark', reduceMotion: false } };
export const OfflinePages: Story = { args: { timerState: 'paused', awaitingPages: true, error: 'Нет подтверждения сервера. Страницы сохранятся на телефоне и отправятся повторно.' } };
export const Permission: Story = { args: { protection: 'permission' } };
export const Unsupported: Story = { args: { protection: 'unavailable' } };
export const Recovery: Story = { args: { needsRecovery: true, timerState: 'paused' } };
export const Applications: Story = { args: { data: { ...readingFixture, phase: 'upcoming', applications: [{ id: 'demo-applicant', teamId: 'demo-team', name: 'Новый читатель' }] } } };
export const Continuous: Story = { args: { data: continuousReadingFixture, timerState: 'running' }, parameters: { scheme: 'dark' } };
export const ContinuousVisitor: Story = { args: { data: { ...continuousReadingFixture, me: null, membership: null } } };
