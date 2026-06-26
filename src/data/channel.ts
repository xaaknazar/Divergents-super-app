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

interface JsonResult { ok: boolean; data: any | null }

async function getJsonResult(path: string, timeoutMs = 12000): Promise<JsonResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, data: null };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, data: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchChannels(): Promise<Channel[]> {
  const { data } = await getJsonResult('/api/mobile/community/channels');
  return Array.isArray(data?.channels) ? (data.channels as Channel[]) : [];
}

export async function fetchChannelPosts(): Promise<ChannelPost[]> {
  const { data } = await getJsonResult('/api/mobile/community/posts');
  return Array.isArray(data?.posts) ? (data.posts as ChannelPost[]) : [];
}

// Loads channels + posts together and reports `error: true` only when both
// requests failed (server unreachable), so screens can show a RETRY state
// instead of an "empty" / "not found" one when the network is down.
export interface ChannelData { channels: Channel[]; posts: ChannelPost[]; error: boolean }

export async function fetchChannelData(): Promise<ChannelData> {
  const [c, p] = await Promise.all([
    getJsonResult('/api/mobile/community/channels'),
    getJsonResult('/api/mobile/community/posts'),
  ]);
  return {
    channels: Array.isArray(c.data?.channels) ? (c.data.channels as Channel[]) : [],
    posts: Array.isArray(p.data?.posts) ? (p.data.posts as ChannelPost[]) : [],
    error: !c.ok && !p.ok,
  };
}
