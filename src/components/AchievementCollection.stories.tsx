import type { Meta, StoryObj } from '@storybook/react-native';
import { demoBadges } from '../storybook/livenFixtures';
import { AchievementCollection } from './AchievementCollection';
const meta = { title: 'Liven/AchievementCollection', component: AchievementCollection, parameters: { canvasLayout: 'screen' },
  args: { badges: demoBadges, earned: demoBadges.filter(b => b.earned).length, total: demoBadges.length, ready: true, storageError: false, refresh: async () => {}, onBack: () => {}, onNavigate: () => {} },
} satisfies Meta<typeof AchievementCollection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Loading: Story = { args: { ready: false } };
export const Error: Story = { args: { ready: false, storageError: true } };
