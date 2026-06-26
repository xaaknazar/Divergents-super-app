// Community channels (Telegram-style) and their posts. Content is published by
// the admin on the Divergents website and read here as JSON — no hardcoded
// channels, authors or sample media. On failure or empty response we return []
// and the screens render a Russian empty state.
import { SFName } from '../components/SFIcon';
import { API_BASE } from './api';

// Only free access tiers remain for v1 ('open' = anyone, 'request' = approval).
export type ChannelAccess = 'open' | 'request';

export interface Channel {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  verified: boolean;
  baseSubscribers: number;
  bio: string;
  access: ChannelAccess;
}

export type PostType = 'audio' | 'article';

export interface ChannelPost {
  id: string;
  channelId: string;
  type: PostType;
  title: string;
  date: string;
  icon: SFName;
  cover?: string;
  audioUrl?: string;
  durationLabel?: string;
  readMins?: number;
  excerpt?: string;
  body?: string[];
  likes: number;
  views: string;
}

async function getJson(path: string, timeoutMs = 12000): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchChannels(): Promise<Channel[]> {
  const d = await getJson('/api/mobile/community/channels');
  return Array.isArray(d?.channels) ? (d.channels as Channel[]) : [];
}

export async function fetchChannelPosts(): Promise<ChannelPost[]> {
  const d = await getJson('/api/mobile/community/posts');
  return Array.isArray(d?.posts) ? (d.posts as ChannelPost[]) : [];
}
