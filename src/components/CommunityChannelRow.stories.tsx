import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { channels } from '../storybook/communityFixtures';
import { CommunityChannelRow } from './CommunityChannelRow';
const meta = { title: 'Сообщество/CommunityChannelRow', component: CommunityChannelRow,
  args: { channel: channels[0], joined: true, unread: 3, latest: { title: 'Почему 20 минут в день лучше марафона', type: 'article', timeLabel: '2 ч назад' }, onPress: fn() },
} satisfies Meta<typeof CommunityChannelRow>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Подписка с новыми: время последней публикации и счётчик. */
export const Unread: Story = {};
export const Read: Story = { args: { unread: 0 } };
export const Voice: Story = { args: { latest: { title: 'Голосовое: итоги недели', type: 'audio', timeLabel: '1 дн назад' }, unread: 0 } };
/** Не подписан: описание, участники и публикации, стрелка. */
export const Guest: Story = { args: { channel: channels[2], joined: false, unread: 0, latest: undefined } };
export const Closed: Story = { args: { channel: channels[1], joined: false, unread: 0, latest: undefined } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
