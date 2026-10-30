import type { Meta,StoryObj } from '@storybook/react-native';
import { CourseCardSkeleton } from './CourseCardSkeleton';
const meta = { title: 'Состояния/CourseCardSkeleton', component: CourseCardSkeleton, args: {},
} satisfies Meta<typeof CourseCardSkeleton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
