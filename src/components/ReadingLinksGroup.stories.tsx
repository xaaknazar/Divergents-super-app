import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingLinksGroup } from './ReadingLinksGroup';
const meta = { title: 'Reading/ReadingLinksGroup', component: ReadingLinksGroup, args: {
  statistics: { onPress: () => {} },
  rank: { place: 4, pagesPlace: 4, participants: 5, onPress: () => {} },
  onHistory: () => {},
} } satisfies Meta<typeof ReadingLinksGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const NoPlaces: Story = { args: { rank: { place: null, pagesPlace: null, participants: 5, onPress: () => {} } } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
