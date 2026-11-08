import type { Meta, StoryObj } from '@storybook/react-native';
import { BookProgressPicker } from './BookProgressPicker';
const meta = { title: 'Books/BookProgressPicker', component: BookProgressPicker,
  args: { value: 25, onChange: () => {} } } satisfies Meta<typeof BookProgressPicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Busy: Story = { args: { disabled: true } };
export const Complete: Story = { args: { value: 100 } };
