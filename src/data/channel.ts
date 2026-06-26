// Community channels (Telegram-style) and their posts. Content is published by
// the admin on the Divergents website and read here as JSON — no hardcoded
// channels, authors or sample media. The server EMBEDS every channel's posts
// inside the single GET /api/mobile/channels response (there is no separate
// /posts endpoint), so the channel list and the flattened post feed both derive
// from that one call. On failure or empty response we return [] and the screens
// render a Russian empty / error state.
import { SFName } from '../components/SFIcon';
import { API_BASE } from './api';

// Only free access tiers remain for v1 ('open' = anyone, 'request' = approval).
// The paid channel was removed, so the server's 'paid' tier maps to 'request'.
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

// ─── Raw server shapes (GET /api/mobile/channels) ──────────────────
interface ApiChannelPost {
  id: string;
  type: 'article' | 'audio';
  title: string;
  body: string | null;
  audioUrl: string | null;
  createdAt: string;
}

interface ApiChannel {
  id: string;
  handle: string | null;
  name: string;
  access: 'open' | 'request' | 'paid';
  price: number | null;
  bio: string | null;
  avatarUrl: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
  posts: ApiChannelPost[];
  _count: { posts: number };
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

// ─── Mapping helpers ───────────────────────────────────────────────
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// Short Russian relative/absolute label the post screens render verbatim.
function relativeRu(iso: string): string {
  const ms = Date.parse(iso);
  if (!isFinite(ms)) return '';
  const diff = Date.now() - ms;
  if (diff < 0) return 'только что';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  const d = new Date(ms);
  const label = `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

// Split rich-text body into paragraphs for the article reader's body[] shape.
function toParagraphs(body: string | null): string[] | undefined {
  if (!body) return undefined;
  const parts = body
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

function excerptFrom(paras: string[] | undefined): string | undefined {
  if (!paras || paras.length === 0) return undefined;
  const text = paras.join(' ');
  return text.length > 140 ? `${text.slice(0, 139).trimEnd()}…` : text;
}

function readMinsFrom(paras: string[] | undefined): number {
  if (!paras || paras.length === 0) return 1;
  const words = paras.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

function mapAccess(access: ApiChannel['access']): ChannelAccess {
  // 'paid' was removed from the app — surface it as a request-to-join channel.
  return access === 'open' ? 'open' : 'request';
}

function mapChannel(c: ApiChannel): Channel {
  return {
    id: String(c.id ?? ''),
    handle: c.handle ?? '',
    name: c.name || 'Без названия',
    avatar: c.avatarUrl ?? '',
    verified: false,
    baseSubscribers: 0,
    bio: c.bio ?? '',
    access: mapAccess(c.access),
  };
}

function mapPost(p: ApiChannelPost, channelId: string): ChannelPost {
  const isAudio = p.type === 'audio';
  const paras = toParagraphs(p.body);
  const base: ChannelPost = {
    id: String(p.id ?? ''),
    channelId,
    type: isAudio ? 'audio' : 'article',
    title: p.title || 'Без названия',
    date: relativeRu(p.createdAt),
    icon: isAudio ? 'waveform' : 'doc.text.fill',
    excerpt: excerptFrom(paras),
    body: paras,
    likes: 0,
    views: '0',
  };
  if (isAudio) {
    if (p.audioUrl) base.audioUrl = p.audioUrl;
    // durationLabel omitted — unknown until the player reports it.
  } else {
    base.readMins = readMinsFrom(paras);
  }
  return base;
}

// Parse the single /api/mobile/channels payload into both view models.
function parseChannels(data: any): { channels: Channel[]; posts: ChannelPost[] } {
  const raw: ApiChannel[] = Array.isArray(data?.channels) ? data.channels : [];
  const valid = raw.filter((c) => c && c.id != null);
  const channels = valid.map(mapChannel);
  const posts = valid.flatMap((c) =>
    (Array.isArray(c.posts) ? c.posts : [])
      .filter((p) => p && p.id != null)
      .map((p) => mapPost(p, String(c.id))),
  );
  return { channels, posts };
}

export async function fetchChannels(): Promise<Channel[]> {
  const { data } = await getJsonResult('/api/mobile/channels');
  return parseChannels(data).channels;
}

// Flattens the posts embedded in the single /channels response (no /posts call).
export async function fetchChannelPosts(): Promise<ChannelPost[]> {
  const { data } = await getJsonResult('/api/mobile/channels');
  return parseChannels(data).posts;
}

// Loads channels + posts together from one request and reports `error: true`
// only when the request failed (server unreachable), so screens can show a
// RETRY state instead of an "empty" / "not found" one when the network is down.
export interface ChannelData { channels: Channel[]; posts: ChannelPost[]; error: boolean }

export async function fetchChannelData(): Promise<ChannelData> {
  const res = await getJsonResult('/api/mobile/channels');
  const { channels, posts } = parseChannels(res.data);
  return { channels, posts, error: !res.ok };
}

// ─── Creator/admin: create a channel (Clerk Bearer) ─────────────────────────
// Returns a normalized result (never throws) so the form stays crash-free and
// can show a precise message — e.g. 403 when the user isn't a creator.
export interface CreateResult { ok: boolean; status: number; id?: string; error?: string }

export interface NewChannelInput {
  name: string;
  handle?: string;
  access: ChannelAccess; // 'open' | 'request'
  bio?: string;
  avatarUrl?: string;
}

export async function createChannel(
  input: NewChannelInput,
  token: string,
  timeoutMs = 15000,
): Promise<CreateResult> {
  if (!token) return { ok: false, status: 401, error: 'no-token' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/channels`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* empty / non-JSON body */ }
    if (!res.ok) return { ok: false, status: res.status, error: data?.error || data?.message };
    return { ok: true, status: res.status, id: data?.id ?? data?.channel?.id };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
