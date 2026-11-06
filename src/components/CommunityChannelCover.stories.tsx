import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { CommunityChannelCover } from './CommunityChannelCover';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';

const meta = {
  title: 'Сообщество/CommunityChannelCover', component: CommunityChannelCover,
  args: { uri: 'https://picsum.photos/seed/divergents-channel/600/400' },
  decorators: [(Story) => <Wrapper marginHorizontal={16}><ContentBlock size="flush"><Story /></ContentBlock></Wrapper>],
} satisfies Meta<typeof CommunityChannelCover>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Landscape: Story = {};
export const Square: Story = { args: { uri: 'https://picsum.photos/seed/divergents-channel/600/600' } };
export const Portrait: Story = { args: { uri: 'https://picsum.photos/seed/divergents-channel/400/600' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Compact: Story = { parameters: { viewport: 'compact' } };
