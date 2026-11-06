import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { LessonActions } from './LessonActions';

const meta = {
  title: 'Обучение/LessonActions', component: LessonActions,
  args: { state: 'completed', next: 'lesson', onContinue: fn() },
} satisfies Meta<typeof LessonActions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Completed: Story = {};
export const LastLesson: Story = { args: { next: 'course' } };
export const Ready: Story = { args: { state: 'ready' } };
export const Locked: Story = { args: { state: 'locked' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Compact: Story = { parameters: { viewport: 'compact' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
