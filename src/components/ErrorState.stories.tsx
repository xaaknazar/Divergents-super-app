import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ErrorState } from './ErrorState';
const meta = { title: 'Состояния/ErrorState', component: ErrorState, args: { onRetry: fn() },
} satisfies Meta<typeof ErrorState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const WithoutRetry: Story = { args: { onRetry: undefined } };
