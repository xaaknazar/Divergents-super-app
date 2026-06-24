// Per-channel subscriptions, join requests, unread tracking and post likes.
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { loadJSON, saveJSON } from './persist';
import { postsByChannel } from '../data/channel';

interface ChannelState {
  joined: string[];
  requested: string[];
  isJoined: (id: string) => boolean;
  isRequested: (id: string) => boolean;
  join: (id: string) => void;
  leave: (id: string) => void;
  request: (id: string) => void;
  unread: (id: string) => number;
  markSeen: (id: string) => void;
  likes: string[];
  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;
}

const Ctx = createContext<ChannelState | null>(null);

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [joined, setJoined] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [likes, setLikes] = useState<string[]>([]);

  useEffect(() => {
    loadJSON<string[]>('dvg.channelJoined.v2', []).then((v) => setJoined(Array.isArray(v) ? v : []));
    loadJSON<string[]>('dvg.channelRequested.v2', []).then((v) => setRequested(Array.isArray(v) ? v : []));
    loadJSON<Record<string, number>>('dvg.channelSeen.v2', {}).then((v) => setSeen(v && typeof v === 'object' ? v : {}));
    loadJSON<string[]>('dvg.channelLikes.v2', []).then((v) => setLikes(Array.isArray(v) ? v : []));
  }, []);

  const join = useCallback((id: string) => setJoined((p) => { const n = p.includes(id) ? p : [id, ...p]; saveJSON('dvg.channelJoined.v2', n); return n; }), []);
  const leave = useCallback((id: string) => setJoined((p) => { const n = p.filter((x) => x !== id); saveJSON('dvg.channelJoined.v2', n); return n; }), []);
  const request = useCallback((id: string) => setRequested((p) => { const n = p.includes(id) ? p : [id, ...p]; saveJSON('dvg.channelRequested.v2', n); return n; }), []);
  const markSeen = useCallback((id: string) => setSeen((p) => { const n = { ...p, [id]: postsByChannel(id).length }; saveJSON('dvg.channelSeen.v2', n); return n; }), []);
  const toggleLike = useCallback((id: string) => setLikes((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [id, ...p]; saveJSON('dvg.channelLikes.v2', n); return n; }), []);

  const unread = useCallback((id: string) => {
    if (!joined.includes(id)) return 0;
    return Math.max(0, postsByChannel(id).length - (seen[id] ?? 0));
  }, [joined, seen]);

  const value = useMemo<ChannelState>(() => ({
    joined, requested,
    isJoined: (id) => joined.includes(id),
    isRequested: (id) => requested.includes(id),
    join, leave, request, unread, markSeen,
    likes, isLiked: (id) => likes.includes(id), toggleLike,
  }), [joined, requested, seen, likes, join, leave, request, unread, markSeen, toggleLike]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChannel() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChannel must be used within ChannelProvider');
  return c;
}
