import type { Meta, StoryObj } from '@storybook/react-native';

import { ResultMetric } from './ResultMetric';
const meta = { title: 'Liven/ResultMetric', component: ResultMetric, 
  args: { kind: 'reading', value: '420', label: 'страниц' },
} satisfies Meta<typeof ResultMetric>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const ReadingDays: Story = { args: { kind: 'completed', value: '12', label: 'дней выполнено' } };
export const ExtraReadingTime: Story = { args: { kind: 'focus', value: '125', label: 'минут сверх цели' } };
