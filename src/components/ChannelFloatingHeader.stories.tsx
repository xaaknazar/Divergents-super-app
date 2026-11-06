import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelFloatingHeader } from './ChannelFloatingHeader';
const meta = { title: 'Сообщество/ChannelFloatingHeader', component: ChannelFloatingHeader,
  args: { name: 'Danday Amokachi', members: 128, onBack: () => {}, onInfo: () => {} },
} satisfies Meta<typeof ChannelFloatingHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LongName: Story = { args: { name: 'Книжный клуб Divergents: читаем вместе каждый день' }, parameters: { textSize: 'xl', viewport: 'compact' } };
