import type { Meta, StoryObj } from '@storybook/react-native';

import { MilestoneIllustration } from './MilestoneIllustration';
const meta = { title: 'Liven/MilestoneIllustration', component: MilestoneIllustration, 
  args: { kind: 'trophy', size: 'celebration' },
} satisfies Meta<typeof MilestoneIllustration>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Book: Story = { args: { kind: 'book', size: 'welcome' } };
export const Companion: Story = { args: { kind: 'companion' } };
export const Animated: Story = { args: { entrance: true }, parameters: { reduceMotion: false } };
