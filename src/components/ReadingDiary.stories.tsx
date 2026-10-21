import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingDiary } from './ReadingDiary';
import type { ReadingDetail } from '../data/reading';
const states = ['complete', 'missed', 'complete', 'complete', 'open'] as const;
const member: NonNullable<ReadingDetail['me']> = { userId: 'me', name: 'Акназар', teamId: null, flags: 1, completedDays: 2, pages: 96,
  elapsedMs: 0, extraMs: 0, eliminatedOn: null, firstDay: 4,
  history: states.map((state, i) => ({ day: i + 4, state, pages: state === 'missed' ? 6 : 30, elapsedMs: state === 'missed' ? 20 * 60000 : 75 * 60000 })) };
const meta = { title: 'Reading/ReadingDiary', component: ReadingDiary, args: { member } } satisfies Meta<typeof ReadingDiary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
