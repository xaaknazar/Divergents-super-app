import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelDateDivider } from './ChannelDateDivider';
const meta = { title: 'Сообщество/ChannelDateDivider', component: ChannelDateDivider,
  args: { date: '2026-11-06T07:30:00Z' },
} satisfies Meta<typeof ChannelDateDivider>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };

