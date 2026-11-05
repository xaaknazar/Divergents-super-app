import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingPagesConfirmation } from './ReadingPagesConfirmation';
const meta = { title: 'Reading/Pages confirmation', component: ReadingPagesConfirmation,
  args: { pages: 415, minutes: 58, onEdit: () => {}, onConfirm: () => {} },
} satisfies Meta<typeof ReadingPagesConfirmation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Saving: Story = { args: { busy: true } };
