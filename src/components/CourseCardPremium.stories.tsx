import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { sampleCourse } from '../storybook/courseFixtures';
import { CourseCardPremium } from './CourseCardPremium';
const meta = { title: 'Обучение/CourseCardPremium', component: CourseCardPremium, args: { course: sampleCourse, onPress: fn() },
} satisfies Meta<typeof CourseCardPremium>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Owned: Story = { args: { owned: true, progress: 45 } };
export const Completed: Story = { args: { owned: true, progress: 100 } };
export const NotStarted: Story = { args: { owned: true, progress: 0 } };
export const Paid: Story = { args: { course: { ...sampleCourse, price: 15000 }, showPrice: true } };
export const Locked: Story = { args: { course: { ...sampleCourse, price: 15000 }, showPrice: false } };
export const Gift: Story = { args: { course: { ...sampleCourse, price: 15000, gifted: true } } };
export const Disabled: Story = { args: { onPress: undefined } };
