import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingPagesStepButton } from './ReadingPagesStepButton';
const meta = { title: 'Reading/Pages step', component: ReadingPagesStepButton,
  args: { direction: 'more', disabled: false, onPress: () => {} },
} satisfies Meta<typeof ReadingPagesStepButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const More: Story = {};
export const Less: Story = { args: { direction: 'less' } };
export const Disabled: Story = { args: { disabled: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
