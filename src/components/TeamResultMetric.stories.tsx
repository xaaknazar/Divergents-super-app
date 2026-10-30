import type { Meta, StoryObj } from '@storybook/react-native';

import { TeamResultMetric } from './TeamResultMetric';
const meta = { title: 'Liven/TeamResultMetric', component: TeamResultMetric, 
  args: { value: '2 400', label: 'Очки команды' },
} satisfies Meta<typeof TeamResultMetric>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
