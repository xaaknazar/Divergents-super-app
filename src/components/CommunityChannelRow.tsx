import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import type { Channel } from '../data/channel';
import type { CommunityStackParams } from '../navigation/types';
import { useChannel } from '../state/ChannelContext';
import { ChannelCard } from './ChannelCard';
import { Wrapper } from './Wrapper';
type Nav = Pick<NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'], 'navigate'>;

/** Context adapter shared by the home feed and every channel list. */
export function CommunityChannelRow({ channel, navigation, variant = 'plain' }: {
  channel: Channel; navigation: Nav; variant?: 'plain' | 'cover';
}) {
  const { memberships, unread, postsByChannel } = useChannel();
  const posts = postsByChannel(channel.id);
  return <Wrapper marginHorizontal={16} marginBottom={12}>
    <ChannelCard channel={channel} variant={variant === 'cover' ? 'featured' : 'list'}
      membership={memberships[channel.id]} postCount={posts.length} unreadCount={unread(channel.id)}
      latestTitle={posts[0]?.title}
      onOpen={() => navigation.navigate('ServerChannel', { channelId: channel.id })} />
  </Wrapper>;
}
