import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { channels } from '../storybook/communityFixtures';
import { CommunityChannelRail } from './CommunityChannelRail';
import { CommunityChannelTile } from './CommunityChannelTile';
const meta = { title: 'Сообщество/CommunityChannelRail', component: CommunityChannelRail,
  args: { children: channels.map((c, i) => <CommunityChannelTile key={c.id} channel={c} joined={i === 0} unread={i === 0 ? 2 : 0} onPress={fn()} />) },
} satisfies Meta<typeof CommunityChannelRail>;
export default meta;
type Story = StoryObj<typeof meta>;
/** В ленте «Сообщества»: с новым — первыми, следующая плитка выглядывает из-за края. */
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
