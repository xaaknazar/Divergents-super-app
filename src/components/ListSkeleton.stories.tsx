import type { Meta,StoryObj } from '@storybook/react-native';
import { ListSkeleton } from './ListSkeleton';
const meta = { title: 'Состояния/ListSkeleton', component: ListSkeleton, args: { rows: 3 },
} satisfies Meta<typeof ListSkeleton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const SingleRow: Story = { args: { rows: 1 } };
