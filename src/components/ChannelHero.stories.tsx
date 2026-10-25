import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChannelHero } from './ChannelHero';
const meta = { title: 'Каналы/ChannelHero', component: ChannelHero,
  args: { name: 'Демо · Книжный клуб', handle: 'bookclub', bio: 'Читаем вместе, делимся заметками и разбираем книги месяца. Новые эфиры по пятницам.',
    avatarUri: 'https://picsum.photos/seed/divergents-books/400/400', access: 'open', memberCount: 1284, postCount: 3, role: 'guest',
    onJoin: fn(), onCompose: fn(), onRequests: fn(), onSettings: fn() },
} satisfies Meta<typeof ChannelHero>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Guest: Story = {};
export const ClosedGuest: Story = { args: { access: 'request', memberCount: 86, postCount: 12 } };
export const Requested: Story = { args: { access: 'request', requested: true } };
export const Joining: Story = { args: { busy: true } };
export const Member: Story = { args: { role: 'member' } };
/** Автор закрытого канала: публикация, заявки со счётчиком и настройки. */
export const Owner: Story = { args: { role: 'owner', access: 'request', pendingRequests: 2 } };
export const WithoutPicture: Story = { args: { avatarUri: null, role: 'member' } };
export const LongBio: Story = { args: { bio: 'Читаем вместе, делимся заметками и разбираем книги месяца. '.repeat(5), role: 'member' } };
export const Dark: Story = { args: { role: 'member' }, parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
