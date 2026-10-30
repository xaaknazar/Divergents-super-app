import type { Meta, StoryObj } from '@storybook/react-native';
import { ChallengeResultMetrics } from './ChallengeResultMetrics';
const meta = { title: 'Challenges/ResultMetrics', component: ChallengeResultMetrics,
  args: { pages: 365, steps: 165657, sugarDays: 15 },
} satisfies Meta<typeof ChallengeResultMetrics>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const SmallScreen: Story = { parameters: { viewport: 'compact' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
