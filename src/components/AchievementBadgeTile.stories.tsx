import type { Meta, StoryObj } from '@storybook/react-native';
import { demoBadges } from '../storybook/livenFixtures';
import { AchievementBadgeTile } from './AchievementBadgeTile';
const meta = { title: 'Liven/AchievementBadgeTile', component: AchievementBadgeTile, 
  args: { b: demoBadges[0], onPress: () => {}, onNavigate: () => {} },
} satisfies Meta<typeof AchievementBadgeTile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Expanded: Story = { args: { expanded: true } };
