import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingPagesNotice } from './ReadingPagesNotice';
const meta = { title: 'Reading/PagesReminder', component: ReadingPagesNotice,
  args: { state: 'required' }, parameters: { canvasLayout: 'content' },
} satisfies Meta<typeof ReadingPagesNotice>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Required: Story = {};
export const Goal: Story = { args: { state: 'goal', onRecord: () => {} } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
