import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChannelSettingsSheet } from './ChannelSettingsSheet';
const meta = { title: 'Каналы/ChannelSettingsSheet', component: ChannelSettingsSheet,
  args: { visible: true, initial: { name: 'Демо · Книжный клуб', handle: 'bookclub', bio: 'Читаем вместе и разбираем книги месяца.', access: 'request', avatarUrl: null },
    members: [{ userId: 'u1', name: 'Демо · Дана', email: 'dana@example.com' }, { userId: 'u2', name: 'Демо · Арман', email: 'arman@example.com' }],
    onPickAvatar: async () => null, onSave: async () => true, onInvite: fn(), onRemoveMember: fn(), onDelete: fn(), onClose: fn() },
} satisfies Meta<typeof ChannelSettingsSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Closed: Story = {};
export const Open: Story = { args: { initial: { name: 'Демо · Психометрика', handle: '', bio: '', access: 'open', avatarUrl: null }, members: [] } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
