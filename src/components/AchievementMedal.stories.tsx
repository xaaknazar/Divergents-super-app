import type { Meta, StoryObj } from '@storybook/react-native';
import { demoBadges } from '../storybook/livenFixtures';
import { AchievementMedal } from './AchievementMedal';
const meta = { title: 'Liven/AchievementMedal', component: AchievementMedal, 
  args: { b: demoBadges[0] },
} satisfies Meta<typeof AchievementMedal>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Locked: Story = { args: { b: { ...demoBadges[0], earned: false, progress: 0, value: 0 } } };
export const Large: Story = { args: { size: 'large' } };
