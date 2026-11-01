import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingStoryEditor } from './ReadingStoryEditor';
import { readingYearHistoryFixture } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Year/ReadingStoryEditor', component: ReadingStoryEditor, args: { data: readingYearHistoryFixture } } satisfies Meta<typeof ReadingStoryEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
