import type { Meta, StoryObj } from '@storybook/react-native';
import { demoBook } from '../storybook/livenFixtures';
import { BookCard } from './BookCard';
const meta = { title: 'Liven/BookCard', component: BookCard, 
  args: { book: demoBook, onPress: () => {} },
} satisfies Meta<typeof BookCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Shelf: Story = { args: { variant: 'shelf', progress: 35 } };
export const NoRatings: Story = { args: { book: { ...demoBook, rating: null, userRating: null, comments: 0, shelf: null } } };
