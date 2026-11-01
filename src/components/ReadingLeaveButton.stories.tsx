import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingLeaveButton } from './ReadingLeaveButton';
import { readingYearHistoryFixture } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Year/ReadingLeaveButton', component: ReadingLeaveButton, args: { busy: false, onLeave: () => {} } } satisfies Meta<typeof ReadingLeaveButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
