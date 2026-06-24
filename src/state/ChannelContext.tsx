// Subscription + likes for the founder's channel. Persisted on-device.
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { loadJSON, saveJSON } from './persist';

interface ChannelState {
  joined: boolean;
  join: () => void;
  leave: () => void;
  likes: string[];
  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;
}

const Ctx = createContext<ChannelState | null>(null);

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [joined, setJoined] = useState(false);
  const [likes, setLikes] = useState<string[]>([]);

  useEffect(() => {
    loadJSON<boolean>('dvg.channelJoined', false).then(setJoined);
    loadJSON<string[]>('dvg.channelLikes', []).then(setLikes);
  }, []);

  const join = useCallback(() => { setJoined(true); saveJSON('dvg.channelJoined', true); }, []);
  const leave = useCallback(() => { setJoined(false); saveJSON('dvg.channelJoined', false); }, []);
  const toggleLike = useCallback((id: string) => {
    setLikes((prev) => { const n = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]; saveJSON('dvg.channelLikes', n); return n; });
  }, []);

  const value = useMemo<ChannelState>(() => ({ joined, join, leave, likes, isLiked: (id) => likes.includes(id), toggleLike }), [joined, join, leave, likes, toggleLike]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChannel() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChannel must be used within ChannelProvider');
  return c;
}
