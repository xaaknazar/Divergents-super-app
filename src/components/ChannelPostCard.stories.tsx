import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChannelPostCard } from './ChannelPostCard';
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const body = 'Мозгу нужен ритм: короткая, но ежедневная сессия закрепляет навык и не выматывает. '.repeat(5);
const meta = { title: 'Каналы/ChannelPostCard', component: ChannelPostCard,
  args: { post: { id: 'p-1', type: 'article', title: 'Почему 20 минут в день лучше марафона', body, createdAt: ago(95),
    reactions: { '👍': 14, '🔥': 6, '❤️': 3 }, myReaction: '🔥' }, reactionOptions: ['👍', '❤️', '🔥', '👏', '🙏'],
    onToggleExpanded: fn(), onPlay: fn(), onReact: fn() },
} satisfies Meta<typeof ChannelPostCard>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Длинная статья свёрнута до шести строк. */
export const Article: Story = {};
export const Expanded: Story = { args: { expanded: true } };
export const Voice: Story = { args: { post: { id: 'p-2', type: 'audio', title: 'Голосовое: итоги недели', audioUrl: 'https://example.invalid/voice.m4a', createdAt: ago(60 * 26), reactions: { '👏': 9 } } } };
export const Playing: Story = { args: { ...Voice.args, playing: true } };
export const NoReactions: Story = { args: { post: { id: 'p-3', type: 'article', title: 'Книга октября', body: 'Читаем Джеймса Клира.', createdAt: ago(60 * 72) } } };
/** У автора канала — меню «…». */
export const Owner: Story = { args: { onMore: fn() } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
