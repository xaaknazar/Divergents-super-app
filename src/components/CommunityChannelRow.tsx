import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import type { Channel } from '../data/channel';
import type { CommunityStackParams } from '../navigation/types';
import { useChannel } from '../state/ChannelContext';
import { ChannelCard } from './ChannelCard';
type Nav = Pick<NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'], 'navigate'>;

/** Context adapter shared by the home feed and every channel list. */
export function CommunityChannelRow({ channel, navigation }: { channel: Channel; navigation: Nav }) {
  const { memberships, unread, postsByChannel } = useChannel();
  const posts = postsByChannel(channel.id);
  return <ChannelCard channel={channel} membership={memberships[channel.id]}
    postCount={posts.length} unreadCount={unread(channel.id)} latestTitle={posts[0]?.title} latestDate={posts[0]?.date}
    onOpen={() => navigation.navigate('ServerChannel', { channelId: channel.id })} />;
}
