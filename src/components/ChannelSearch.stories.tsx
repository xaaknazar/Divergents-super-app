import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelSearch } from './ChannelSearch';
const meta = { title: 'Сообщество/ChannelSearch', component: ChannelSearch,
  args: { value: '', onChange: () => {}, placeholder: 'Поиск каналов' },
} satisfies Meta<typeof ChannelSearch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Filled: Story = { args: { value: 'Книги', onClose: () => {} } };
