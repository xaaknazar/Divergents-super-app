import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingReviewPanel } from './ReadingReviewPanel';
const meta = { title: 'Reading/AdminReview', component: ReadingReviewPanel,
  args: { days: [{ userId: 'demo-reader', name: 'Читатель', day: 3, elapsedMs: 3600000, pages: 22 }], busy: false, onResolve: () => {} },
} satisfies Meta<typeof ReadingReviewPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Empty: Story = { args: { days: [] } };
