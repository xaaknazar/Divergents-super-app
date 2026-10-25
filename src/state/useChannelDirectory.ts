import { useMemo } from 'react';
import { Channel, channelTimeLabel } from '../data/channel';
import type { ChannelLatest } from '../components/CommunityChannelRow';
import { useChannel } from './ChannelContext';

export type ChannelDirectoryItem = { channel: Channel; joined: boolean; unread: number; latest?: ChannelLatest; latestAt: number };

/** Каналы для «Сообщества»: свои — сверху (сначала с новыми, затем по свежести), остальные — следом. */
export function useChannelDirectory() {
  const { channels, loading, error, reload, isJoined, unread, postsByChannel } = useChannel();
  return useMemo(() => {
    const items: ChannelDirectoryItem[] = channels.map(channel => {
      const last = postsByChannel(channel.id)[0];
      const latestAt = last ? Date.parse(last.createdAt) || 0 : 0;
      return { channel, joined: isJoined(channel.id), unread: unread(channel.id), latestAt,
        latest: last ? { title: last.title, type: last.type, timeLabel: channelTimeLabel(last.createdAt) } : undefined };
    });
    const mine = items.filter(i => i.joined).sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.latestAt - a.latestAt);
    const others = items.filter(i => !i.joined);
    return { mine, others, all: [...mine, ...others], loading, error, reload };
  }, [channels, loading, error, reload, isJoined, unread, postsByChannel]);
}
