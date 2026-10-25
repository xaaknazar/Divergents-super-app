import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { channels } from '../storybook/communityFixtures';
import { CommunityChannelList } from './CommunityChannelList';
import { CommunityChannelRow } from './CommunityChannelRow';
const meta = { title: 'Сообщество/CommunityChannelList', component: CommunityChannelList,
  args: { title: 'Другие каналы', footer: 'Открытые каналы можно читать сразу, в закрытые вступают по одобрению автора.',
    children: channels.map(c => <CommunityChannelRow key={c.id} channel={c} joined={false} onPress={fn()} />) },
} satisfies Meta<typeof CommunityChannelList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const WithoutCaptions: Story = { args: { title: undefined, footer: undefined } };
