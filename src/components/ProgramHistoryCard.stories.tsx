import type { Meta, StoryObj } from '@storybook/react-native';
import { demoProgram, demoProgramStats } from '../storybook/livenFixtures';
import { ProgramHistoryCard } from './ProgramHistoryCard';
const meta = { title: 'Liven/ProgramHistoryCard', component: ProgramHistoryCard, 
  args: { program: demoProgram, stats: demoProgramStats, onPress: () => {} },
} satisfies Meta<typeof ProgramHistoryCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
