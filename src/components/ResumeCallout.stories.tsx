import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ResumeCalloutCard } from './ResumeCallout';

const meta = { title: 'Основа/ResumeCalloutCard', component: ResumeCalloutCard,
  args: { area: 'career', done: 1, needed: 4, onPress: fn() },
} satisfies Meta<typeof ResumeCalloutCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Career: Story = {};
export const Community: Story = { args: { area: 'community', done: 2, needed: 3 } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
