// Channels + posts (loaded from the website API) and the signed-in user's
// membership in them. Paid channels were cut for v1 — only free tiers
// ('open', 'request') remain.
//
// Членство — за сервером. Раньше список подписок жил только в локальном
// состоянии и никем не заполнялся, поэтому «Вы участник», счётчик непрочитанных
// и лайки были мертвы. Теперь единственный источник правды — /api/mobile/me/channels
// (и ответ POST /channels/:id/join), а локально хранится только то, чего на
// сервере нет вовсе: отметка «последний просмотренный пост» для бейджа.
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import { Channel, ChannelPost, fetchChannelData } from '../data/channel';
import { fetchMyChannelMemberships, joinChannel } from '../data/api';

interface ChannelState {
  channels: Channel[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  getChannel: (id: string) => Channel | undefined;
  postsByChannel: (id: string) => ChannelPost[];
  getPost: (id: string) => ChannelPost | undefined;
  // Состояние членства с сервера: 'subscribed' | 'approved' | 'requested'.
  memberships: Record<string, string>;
  isJoined: (id: string) => boolean;
  join: (id: string) => Promise<string | null>;
  unread: (id: string) => number;
  markSeen: (id: string) => void;
}

const Ctx = createContext<ChannelState | null>(null);

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [memberships, setMemberships] = useState<Record<string, string>>({});
  const [seen, setSeen] = useState<Record<string, number>>({});

  // Clerk's getToken is not guaranteed to be referentially stable; reading it
  // through a ref keeps reload()/join() stable so they can't retrigger effects.
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const reloadMemberships = useCallback(async () => {
    let token: string | null = null;
    try { token = await getTokenRef.current(); } catch { token = null; }
    setMemberships(await fetchMyChannelMemberships(token));
  }, []);

  // Mirror the latest channels into a ref so reload() can read the current count
  // on failure without depending on `channels.length` — that dependency made the
  // mount effect re-run reload() on every fetch, double-fetching the list.
  const channelsRef = useRef<Channel[]>([]);
  const reload = useCallback(() => {
    setLoading(true);
    void reloadMemberships();
    fetchChannelData()
      .then(({ channels: ch, posts: ps, error: err }) => {
        channelsRef.current = ch;
        setChannels(ch);
        setPosts(ps);
        // Only flag an error when the request failed AND we have nothing to show,
        // so a transient refresh failure never blanks already-loaded content.
        setError(err && ch.length === 0);
      })
      .catch(() => setError((prev) => prev || channelsRef.current.length === 0))
      .finally(() => setLoading(false));
  }, [reloadMemberships]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    // Merge, don't replace: markSeen may already have run for the open channel
    // before the async read finished, and the fresher value must win.
    loadJSON<Record<string, number>>('dvg.channelSeen.v2', {})
      .then((v) => { if (v && typeof v === 'object') setSeen((cur) => ({ ...v, ...cur })); });
  }, []);

  const postsByChannel = useCallback((id: string) => posts.filter((p) => p.channelId === id), [posts]);
  const getPost = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);
  const getChannel = useCallback((id: string) => channels.find((c) => c.id === id), [channels]);

  // Открытым каналам сервер сразу ставит 'subscribed', закрытым — 'requested'
  // и позже 'approved'; участником считаются только первое и третье.
  const isJoined = useCallback((id: string) => {
    const s = memberships[id];
    return s === 'subscribed' || s === 'approved';
  }, [memberships]);

  const join = useCallback(async (id: string) => {
    let token: string | null = null;
    try { token = await getTokenRef.current(); } catch { token = null; }
    const state = await joinChannel(token, id);
    if (state) setMemberships((p) => ({ ...p, [id]: state }));
    return state;
  }, []);

  const markSeen = useCallback((id: string) => setSeen((p) => {
    const total = posts.filter((x) => x.channelId === id).length;
    if (p[id] === total) return p; // без изменений — не пишем в хранилище и не перерисовываем
    const n = { ...p, [id]: total };
    saveJSON('dvg.channelSeen.v2', n);
    return n;
  }), [posts]);

  const unread = useCallback((id: string) => {
    if (!isJoined(id)) return 0;
    return Math.max(0, posts.filter((x) => x.channelId === id).length - (seen[id] ?? 0));
  }, [isJoined, seen, posts]);

  const value = useMemo<ChannelState>(() => ({
    channels, loading, error, reload, getChannel, postsByChannel, getPost,
    memberships, isJoined, join, unread, markSeen,
  }), [channels, loading, error, reload, getChannel, postsByChannel, getPost, memberships, isJoined, join, unread, markSeen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChannel() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChannel must be used within ChannelProvider');
  return c;
}
