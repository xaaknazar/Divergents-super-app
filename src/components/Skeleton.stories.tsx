import type { Meta,StoryObj } from '@storybook/react-native';
import { Skeleton } from './Skeleton';
const meta = { title: 'Состояния/Skeleton', component: Skeleton, args: { variant: 'body' },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Title: Story = { args: { variant: 'title' } };
export const Cover: Story = { args: { variant: 'cover' } };
export const Avatar: Story = { args: { variant: 'avatar' } };
export const Animated: Story = { parameters: { reduceMotion: false } };
