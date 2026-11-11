import type { Meta, StoryObj } from '@storybook/react-native';
import { BookCoverPreview } from './BookCoverPreview';
const meta = { title: 'Книги/BookCoverPreview', component: BookCoverPreview,
  parameters: { reduceMotion: false },
  args: { title: 'Демонстрационная обложка', imageUrl: 'https://covers.openlibrary.org/b/id/12539702-L.jpg' },
} satisfies Meta<typeof BookCoverPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const ReducedMotion: Story = { parameters: { reduceMotion: true } };
export const NoCover: Story = { args: { imageUrl: null } };
export const FailedCover: Story = { args: { imageUrl: 'https://example.invalid/cover.jpg' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
