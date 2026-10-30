import type { Meta,StoryObj } from '@storybook/react-native';
import { CourseGridSkeleton } from './CourseGridSkeleton';
const meta = { title: 'Состояния/CourseGridSkeleton', component: CourseGridSkeleton, args: { count: 4 },
} satisfies Meta<typeof CourseGridSkeleton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Compact: Story = { parameters: { viewport: 'compact' } };
