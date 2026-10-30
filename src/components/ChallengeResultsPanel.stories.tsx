import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { demoResults } from '../storybook/livenFixtures';
import { ChallengeResultsPanel } from './ChallengeResultsPanel';
import { ChallengeResultsContent } from './ChallengeResultsContent';

/** UI contract of the authenticated adapter; no Clerk session or award requests in Storybook. */
const meta = { title: 'Liven/ChallengeResultsPanel', component: ChallengeResultsPanel,
  args: { data: demoResults },
  render: args => <ChallengeResultsContent {...args} onClaimAward={async () => true} />,
} satisfies Meta<typeof ChallengeResultsPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
