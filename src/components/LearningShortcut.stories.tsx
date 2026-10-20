import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { LearningShortcut } from './LearningShortcut';

const meta = { title: 'Обучение/LearningShortcut', component: LearningShortcut,
  args: { kind: 'gift', subtitle: '3 курса открыты бесплатно — до 31 декабря', onPress: fn() },
} satisfies Meta<typeof LearningShortcut>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Gift: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
