// Channels + posts (loaded from the website API), plus per-channel
// subscriptions, join requests, unread tracking and post likes. Paid channels
// were cut for v1 — only free tiers ('open', 'request') remain.
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { loadJSON, saveJSON } from './persist';
import { Channel, ChannelPost, fetchChannelData } from '../data/channel';

interface ChannelState {
  channels: Channel[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  getChannel: (id: string) => Channel | undefined;
  postsByChannel: (id: string) => ChannelPost[];
  getPost: (id: string) => ChannelPost | undefined;
  joined: string[];
  requested: string[];
  isJoined: (id: string) => boolean;
  isRequested: (id: string) => boolean;
  join: (id: string) => void;
  leave: (id: string) => void;
  request: (id: string) => void;
  approved: string[];
  isApproved: (id: string) => boolean;
  approve: (id: string) => void;
  unread: (id: string) => number;
  markSeen: (id: string) => void;
  likes: string[];
  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;
}

const Ctx = createContext<ChannelState | null>(null);

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [joined, setJoined] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [approved, setApproved] = useState<string[]>([]);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [likes, setLikes] = useState<string[]>([]);

  const reload = useCallback(() => {
    setLoading(true);
    fetchChannelData()
      .then(({ channels: ch, posts: ps, error: err }) => {
        setChannels(ch);
        setPosts(ps);
        // Only flag an error when the request failed AND we have nothing to show,
        // so a transient refresh failure never blanks already-loaded content.
        setError(err && ch.length === 0);
      })
      .catch(() => setError((prev) => prev || channels.length === 0))
      .finally(() => setLoading(false));
  }, [channels.length]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    loadJSON<string[]>('dvg.channelJoined.v2', []).then((v) => setJoined(Array.isArray(v) ? v : []));
    loadJSON<string[]>('dvg.channelRequested.v2', []).then((v) => setRequested(Array.isArray(v) ? v : []));
    loadJSON<string[]>('dvg.channelApproved.v2', []).then((v) => setApproved(Array.isArray(v) ? v : []));
    loadJSON<Record<string, number>>('dvg.channelSeen.v2', {}).then((v) => setSeen(v && typeof v === 'object' ? v : {}));
    loadJSON<string[]>('dvg.channelLikes.v2', []).then((v) => setLikes(Array.isArray(v) ? v : []));
  }, []);

  const postsByChannel = useCallback((id: string) => posts.filter((p) => p.channelId === id), [posts]);
  const getPost = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);
  const getChannel = useCallback((id: string) => channels.find((c) => c.id === id), [channels]);

  const join = useCallback((id: string) => setJoined((p) => { const n = p.includes(id) ? p : [id, ...p]; saveJSON('dvg.channelJoined.v2', n); return n; }), []);
  const leave = useCallback((id: string) => setJoined((p) => { const n = p.filter((x) => x !== id); saveJSON('dvg.channelJoined.v2', n); return n; }), []);
  const request = useCallback((id: string) => setRequested((p) => { const n = p.includes(id) ? p : [id, ...p]; saveJSON('dvg.channelRequested.v2', n); return n; }), []);
  const approve = useCallback((id: string) => setApproved((p) => { const n = p.includes(id) ? p : [id, ...p]; saveJSON('dvg.channelApproved.v2', n); return n; }), []);
  const markSeen = useCallback((id: string) => setSeen((p) => { const n = { ...p, [id]: posts.filter((x) => x.channelId === id).length }; saveJSON('dvg.channelSeen.v2', n); return n; }), [posts]);
  const toggleLike = useCallback((id: string) => setLikes((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [id, ...p]; saveJSON('dvg.channelLikes.v2', n); return n; }), []);

  const unread = useCallback((id: string) => {
    if (!joined.includes(id)) return 0;
    return Math.max(0, posts.filter((x) => x.channelId === id).length - (seen[id] ?? 0));
  }, [joined, seen, posts]);

  const value = useMemo<ChannelState>(() => ({
    channels, loading, error, reload, getChannel, postsByChannel, getPost,
    joined, requested,
    isJoined: (id) => joined.includes(id),
    isRequested: (id) => requested.includes(id),
    join, leave, request, unread, markSeen,
    approved, isApproved: (id) => approved.includes(id), approve,
    likes, isLiked: (id) => likes.includes(id), toggleLike,
  }), [channels, loading, error, reload, getChannel, postsByChannel, getPost, joined, requested, approved, seen, likes, join, leave, request, approve, unread, markSeen, toggleLike]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChannel() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChannel must be used within ChannelProvider');
  return c;
}
