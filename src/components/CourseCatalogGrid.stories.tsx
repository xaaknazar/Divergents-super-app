import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { sampleCourses } from '../storybook/courseFixtures';
import { CourseCatalogGrid } from './CourseCatalogGrid';
const meta = { title: 'Обучение/CourseCatalogGrid', component: CourseCatalogGrid, args: { courses: sampleCourses, ownedProgress: { 'storybook-learning': 45 }, showPrice: true, onCoursePress: fn() },
} satisfies Meta<typeof CourseCatalogGrid>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Empty: Story = { args: { courses: [] } };
export const Compact: Story = { parameters: { viewport: 'compact' } };
