import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingLocalPause } from './ReadingLocalPause';
const meta = { title: 'Reading/Local pause', component: ReadingLocalPause,
  args: { onPause: () => {} },
} satisfies Meta<typeof ReadingLocalPause>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Offline: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
