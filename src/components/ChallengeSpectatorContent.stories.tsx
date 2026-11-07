import React from 'react';
import { Screen } from './Screen';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ChallengeSpectatorContent } from './ChallengeSpectatorContent';
import { spectatorFixture } from '../storybook/challengeSpectatorFixtures';
const meta = { title: 'Challenges/Spectator', component: ChallengeSpectatorContent,
  args: { data: spectatorFixture, onRefresh: () => {} }, parameters: { canvasLayout: 'screen', background: 'accent', reduceTransparency: false },
  decorators: [(Story) => <Screen scroll={false} topInset={false} aurora={false} wash="strong" tabPadding={false}><Story /></Screen>],
} satisfies Meta<typeof ChallengeSpectatorContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Empty: Story = { args: { data: { ...spectatorFixture, teams: [], members: [] } } };

export const NoBackground: Story = { parameters: { background: 'none' } };
export const ReducedTransparency: Story = { parameters: { scheme: 'dark', reduceTransparency: true } };
export const LongNames: Story = { args: { data: { ...spectatorFixture, teams: spectatorFixture.teams.map(team => ({ ...team, name: 'Большая команда читателей Divergents из Алматы' })) } }, parameters: { viewport: 'compact', textSize: 'xl' } };
