import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelGlassControl } from './ChannelGlassControl';
const meta = { title: 'Сообщество/ChannelGlassControl', component: ChannelGlassControl,
  args: { label: 'Подписаться', caption: 'Подписаться', onPress: () => {} },
} satisfies Meta<typeof ChannelGlassControl>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Search: Story = { args: { caption: undefined, label: 'Поиск по каналу', icon: 'magnifyingglass' } };
export const Pending: Story = { args: { disabled: true, label: 'Запрос отправлен', caption: 'Запрос отправлен' } };
