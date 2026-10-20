import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingTimer } from './ReadingTimer';
const meta = { title: 'Reading/Timer', component: ReadingTimer,
  args: { remainingMs: 2400000, state: 'running' },
} satisfies Meta<typeof ReadingTimer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Running: Story = { parameters: { reduceMotion: false } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const ReducedMotion: Story = { parameters: { reduceMotion: true } };
export const Ready: Story = { args: { state: 'ready', remainingMs: 3600000 } };
export const Paused: Story = { args: { state: 'paused' } };
export const Complete: Story = { args: { state: 'complete', remainingMs: 0 } };
export const Overtime: Story = { args: { state: 'running', remainingMs: -925000 } };
export const Resumed: Story = { args: { state: 'ready', remainingMs: 2520000 } };
export const Recording: Story = { args: { state: 'recording' } };
export const Saving: Story = { args: { state: 'saving' } };
export const OvertimeDark: Story = { args: { state: 'overtime', remainingMs: -754000 }, parameters: { scheme: 'dark' } };
export const Done: Story = { args: { state: 'done', remainingMs: 0, extraMs: 754000 } };
export const DoneDark: Story = { args: { state: 'done', remainingMs: 0, extraMs: 754000 }, parameters: { scheme: 'dark' } };
