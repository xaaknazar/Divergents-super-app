import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { challenge } from '../storybook/communityFixtures';
import { CommunityChallengeCard } from './CommunityChallengeCard';
const meta = { title: 'Компоненты/CommunityChallengeCard', component: CommunityChallengeCard,
  
  args: { ch: challenge, onPress: fn() },
} satisfies Meta<typeof CommunityChallengeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
