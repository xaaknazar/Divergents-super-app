import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { sampleCourses } from '../storybook/courseFixtures';
import { OwnedCourseShelf } from './OwnedCourseShelf';
const meta = { title: 'Обучение/OwnedCourseShelf', component: OwnedCourseShelf, args: { courses: sampleCourses, progress: { 'storybook-learning': 45, 'storybook-focus': 100, 'storybook-gift': 0 }, onCoursePress: fn() },
} satisfies Meta<typeof OwnedCourseShelf>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Empty: Story = { args: { courses: [] } };
export const Compact: Story = { parameters: { viewport: 'compact' } };
