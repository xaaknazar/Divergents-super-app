import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingRankLink } from './ReadingRankLink';
const meta = { title: 'Reading/ReadingRankLink', component: ReadingRankLink,
  args: { place: 31, participants: 48, onPress: () => {} } } satisfies Meta<typeof ReadingRankLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ranked: Story = {};
export const Leader: Story = { args: { place: 1, participants: 21 } };
export const FirstDay: Story = { args: { place: 48 } };
export const NoMembership: Story = { args: { place: null } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { place: 131, participants: 248 }, parameters: { textSize: 'xl', viewport: 'compact' } };
