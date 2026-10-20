import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingChallengeCard } from './ReadingChallengeCard';
import { readingFixture } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Catalog card', component: ReadingChallengeCard,
  args: { challenge: readingFixture, onPress: () => {} },
} satisfies Meta<typeof ReadingChallengeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = {};
export const Compact: Story = { args: { variant: 'compact' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Recruiting: Story = { args: { challenge: { ...readingFixture, phase: 'upcoming', membership: null } } };
export const NotJoined: Story = { args: { challenge: { ...readingFixture, membership: null } } };
export const Spectator: Story = { args: { challenge: { ...readingFixture, membership: null } } };
export const Finished: Story = { args: { challenge: { ...readingFixture, phase: 'finished' } } };
export const Continuous: Story = { args: { challenge: { ...readingFixture, mode: 'continuous', membership: null } } };
export const Paper: Story = { args: { challenge: { ...readingFixture, title: '"Extreme reading" Challenge', mode: 'continuous' } } };
export const PaperDark: Story = { ...Paper, parameters: { scheme: 'dark' } };
export const PaperLargeText: Story = { ...Paper, parameters: { scheme: 'dark', viewport: 'compact', textSize: 'xl' } };
export const LongTitle: Story = { args: { challenge: { ...readingFixture, title: 'Вместе читаем книги и делимся открытиями каждый день', mode: 'continuous' } } };
export const CompactDark: Story = { args: { variant: 'compact', challenge: { ...readingFixture, title: '"Extreme reading" Challenge', mode: 'continuous' } }, parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { args: { variant: 'compact' }, parameters: { viewport: 'compact', textSize: 'xl' } };
