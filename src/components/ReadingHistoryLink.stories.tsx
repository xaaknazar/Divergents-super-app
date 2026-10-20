import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingHistoryLink } from './ReadingHistoryLink';
const meta = { title: 'Reading/ReadingHistoryLink', component: ReadingHistoryLink, args: { onPress: () => {} } } satisfies Meta<typeof ReadingHistoryLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
