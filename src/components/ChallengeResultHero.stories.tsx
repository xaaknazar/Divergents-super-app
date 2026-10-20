import type { Meta, StoryObj } from '@storybook/react-native';

import { ChallengeResultHero } from './ChallengeResultHero';
const meta = { title: 'Liven/ChallengeResultHero', component: ChallengeResultHero, 
  args: { title: 'Демо · 21 день развития', sequence: 2, won: true, teamName: 'Демо-команда', durationDays: 21, canClaim: true, claimed: false, claiming: false, onClaim: () => {} },
} satisfies Meta<typeof ChallengeResultHero>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Finished: Story = { args: { won: false } };
export const Claimed: Story = { args: { canClaim: false, claimed: true } };
export const Busy: Story = { args: { claiming: true } };
