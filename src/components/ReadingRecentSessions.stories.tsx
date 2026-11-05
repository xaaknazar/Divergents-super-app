import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingRecentSessions } from './ReadingRecentSessions';
import { correctionFixture } from './ReadingSessionCorrection.stories';
const meta = { title: 'Reading/Recent approaches', component: ReadingRecentSessions,
  args: { sessions: [correctionFixture, { ...correctionFixture, id: 'second', book: 'Атомные привычки', pages: 20, elapsedMs: 30 * 60000 }], busy: false, onSave: async () => {} },
} satisfies Meta<typeof ReadingRecentSessions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Empty: Story = { args: { sessions: [] } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
