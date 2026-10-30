import type { Meta,StoryObj } from '@storybook/react-native';
import { CourseCover } from './CourseCover';

const meta = { title: 'Обучение/CourseCover', component: CourseCover, args: { icon: 'book.fill' },
} satisfies Meta<typeof CourseCover>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Featured: Story = { args: { variant: 'featured' } };
