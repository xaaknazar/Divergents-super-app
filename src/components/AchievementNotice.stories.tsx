import type { Meta, StoryObj } from '@storybook/react-native';
import { demoBadges } from '../storybook/livenFixtures';
import { AchievementNotice } from './AchievementNotice';
const meta = { title: 'Liven/AchievementNotice', component: AchievementNotice,
  parameters: { canvasLayout: 'screen' }, args: { badge: demoBadges[0], count: 1, onOpen: () => {}, onClose: () => {} },
} satisfies Meta<typeof AchievementNotice>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Multiple: Story = { args: { count: 3 } };
export const CompactLargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
