// Live data client for the Divergents LMS website.
// Talks to the public read-only API added at /api/mobile on divergents-lms.kz.
import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';
import { Course, Lesson } from './courses';

export const API_BASE = 'https://divergents-lms.kz';

// A Lesson that also carries an optional offline-audio URL (Mux audio.m4a).
// Kept local to avoid touching the shared courses.ts Lesson interface; values
// are read back through `lessonAudioUrl()` so callers stay type-safe.
export type LessonWithAudio = Lesson & { audioUrl?: string | null };

// Safe accessor for a lesson's optional offline-audio URL.
export function lessonAudioUrl(lesson: Lesson): string | null {
  return (lesson as LessonWithAudio).audioUrl ?? null;
}

interface ApiCourseSummary {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  category: string | null;
  categoryId: string | null;
  chaptersCount: number;
}

interface ApiChapter {
  id: string;
  title: string;
  description: string | null;
  position: number;
  isFree: boolean;
  playbackId: string | null;
  hlsUrl: string | null;
  // Optional Mux audio rendition (audio.m4a) for offline audio downloads.
  // Only present on the owned-course detail endpoint (/api/mobile/me/courses/:id).
  audioUrl?: string | null;
}

interface ApiCourseDetail {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  category: string | null;
  attachments: { id: string; name: string; url: string }[];
  chapters: ApiChapter[];
  progress?: number; // 0..100, present on the owned-course detail endpoint
}

// Deterministic icon/tint per course so cards still look good without a cover.
const PALETTE: { icon: SFName; tint: string; iconColor: string }[] = [
  { icon: 'crown.fill', tint: '#E8ECFB', iconColor: T.brand },
  { icon: 'brain.head.profile', tint: '#E5DCEC', iconColor: T.purple },
  { icon: 'target', tint: '#DEF0DF', iconColor: T.green },
  { icon: 'puzzlepiece.fill', tint: '#FEEAD0', iconColor: T.orange },
  { icon: 'heart.text.square.fill', tint: '#FCE2E2', iconColor: T.red },
  { icon: 'graduationcap.fill', tint: '#E1E7F8', iconColor: T.brandAccent },
];

function decor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

const lessonsLabel = (n: number) => plural(n, 'урок', 'урока', 'уроков');

function mapSummary(c: ApiCourseSummary): Course {
  const id = String(c?.id ?? '');
  const d = decor(id);
  const count = typeof c?.chaptersCount === 'number' && c.chaptersCount >= 0 ? c.chaptersCount : 0;
  return {
    id,
    title: c?.title || 'Без названия',
    author: c?.category || 'Divergents',
    category: c?.category || 'Курсы',
    description: c?.description || '',
    lessonsLabel: lessonsLabel(count),
    chaptersCount: count,
    imageUrl: c.imageUrl,
    price: c.price,
    icon: d.icon,
    tint: d.tint,
    iconColor: d.iconColor,
    lessons: [],
    source: 'live',
  };
}

function mapDetail(c: ApiCourseDetail): Course {
  const safe = (c ?? {}) as ApiCourseDetail;
  const id = String(safe.id ?? '');
  const d = decor(id);
  // Guard against an unexpected 200 payload without a chapters array.
  const chapters = Array.isArray(safe.chapters) ? safe.chapters.filter(Boolean) : [];
  // `audioUrl` is carried alongside the standard Lesson fields. Until the shared
  // Lesson interface (data/courses.ts) gains the field, we type the mapped array
  // with a local extension so the literal stays type-checked. Read it back with
  // the `lessonAudioUrl()` helper below.
  const lessons: LessonWithAudio[] = chapters.map((ch, i) => ({
    id: String(ch.id ?? `ch-${i}`),
    n: i + 1,
    title: ch.title || `Урок ${i + 1}`,
    duration: ch.isFree ? 'Видео · бесплатно' : 'Видео',
    minutes: 0,
    isFree: ch.isFree === true,
    playbackId: ch.playbackId ?? null,
    hlsUrl: ch.hlsUrl ?? null,
    description: ch.description ?? null,
    audioUrl: ch.audioUrl ?? null,
  }));
  const attachments = Array.isArray(safe.attachments)
    ? safe.attachments.filter((a) => a && a.id != null && a.url != null)
    : [];
  return {
    id,
    title: safe.title || 'Без названия',
    author: safe.category || 'Divergents',
    category: safe.category || 'Курсы',
    description: safe.description || '',
    lessonsLabel: lessonsLabel(lessons.length),
    chaptersCount: lessons.length,
    imageUrl: safe.imageUrl ?? null,
    price: safe.price ?? null,
    icon: d.icon,
    tint: d.tint,
    iconColor: d.iconColor,
    lessons,
    attachments,
    source: 'live',
  };
}

async function getJson(path: string, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchCatalog(): Promise<Course[]> {
  const data = await getJson('/api/mobile/courses');
  const raw = Array.isArray(data?.courses) ? data.courses : Array.isArray(data) ? data : [];
  return raw.filter((c: any) => c && c.id != null).map(mapSummary);
}

export async function fetchCourseDetail(id: string): Promise<Course> {
  const data: ApiCourseDetail = await getJson(`/api/mobile/courses/${id}`);
  return mapDetail(data);
}

// Format a ₸ price (or "Бесплатно").
// Group thousands with a regular space. (toLocaleString uses a non-breaking
// space that renders inconsistently in the Gotham font and breaks layouts.)
export function groupNum(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
export function formatPrice(price: number | null | undefined): string {
  if (price == null || price <= 0) return 'Бесплатно';
  return `${groupNum(price)} ₸`;
}

// ─── Authenticated (Clerk) endpoints ──────────────────────────────
async function getJsonAuthed(path: string, token: string, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

interface ApiOwnedCourse extends ApiCourseSummary { progress: number; owned: boolean }

export async function fetchMyCourses(token: string): Promise<Course[]> {
  const data = await getJsonAuthed('/api/mobile/me/courses', token);
  const raw = Array.isArray(data?.courses) ? data.courses : Array.isArray(data) ? data : [];
  return raw
    .filter((c: any) => c && c.id != null)
    .map((c: ApiOwnedCourse) => ({
      ...mapSummary(c),
      serverProgress: typeof c.progress === 'number' ? c.progress : undefined,
      source: 'live' as const,
    }));
}

// Owned course detail (chapters unlocked with Mux HLS for every chapter).
export async function fetchOwnedDetail(id: string, token: string): Promise<Course & { owned: boolean }> {
  const data: ApiCourseDetail = await getJsonAuthed(`/api/mobile/me/courses/${id}`, token);
  return {
    ...mapDetail(data),
    owned: true,
    ...(typeof data.progress === 'number' ? { serverProgress: data.progress } : {}),
  };
}

// Best-effort: tell the website a lesson/chapter is completed so progress
// syncs across devices. Silently ignored if the endpoint is unavailable
// (local completion is already saved). Matches BACKEND.md:
//   POST /api/mobile/me/courses/:id/progress  body { lessonId, completed }
export async function markLessonComplete(
  courseId: string, lessonId: string, token: string,
): Promise<void> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    await fetch(`${API_BASE}/api/mobile/me/courses/${courseId}/progress`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lessonId, completed: true }),
    });
  } catch {
    // best-effort — local completion is already saved
  } finally {
    clearTimeout(t);
  }
}

// Strip HTML tags / decode common entities (chapter descriptions are rich text).
export function stripHtml(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Chapter discussion (comments) — reuses the website's existing API ──────
export interface ChapterComment {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  user: { id: string; firstName: string | null; lastName: string | null };
}

// Throws on a network/HTTP failure so callers can show an error/retry state
// (a successful 200 with no comments resolves to an empty array instead).
export async function fetchComments(courseId: string, chapterId: string): Promise<ChapterComment[]> {
  const data = await getJson(`/api/courses/${courseId}/chapters/${chapterId}/comments`);
  const raw = Array.isArray(data) ? data : Array.isArray(data?.comments) ? data.comments : [];
  return raw
    .filter((c: any) => c && c.id != null)
    .map((c: any): ChapterComment => ({
      id: String(c.id),
      content: typeof c.content === 'string' ? c.content : '',
      isPinned: c.isPinned === true,
      createdAt: c.createdAt ?? '',
      likesCount: typeof c.likesCount === 'number' ? c.likesCount : 0,
      isLikedByCurrentUser: c.isLikedByCurrentUser === true,
      user: {
        id: String(c.user?.id ?? ''),
        firstName: c.user?.firstName ?? null,
        lastName: c.user?.lastName ?? null,
      },
    }));
}

export async function postComment(
  courseId: string, chapterId: string, content: string, token: string
): Promise<ChapterComment | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/courses/${courseId}/chapters/${chapterId}/comments`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const c = await res.json();
    if (!c || c.id == null) return null;
    return {
      id: String(c.id),
      content: typeof c.content === 'string' ? c.content : content,
      isPinned: c.isPinned === true,
      createdAt: c.createdAt ?? new Date().toISOString(),
      likesCount: typeof c.likesCount === 'number' ? c.likesCount : 0,
      isLikedByCurrentUser: c.isLikedByCurrentUser === true,
      user: {
        id: String(c.user?.id ?? ''),
        firstName: c.user?.firstName ?? null,
        lastName: c.user?.lastName ?? null,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Route remote images through the website's Next.js image optimizer
// (/_next/image) to get resized WebP/AVIF — much smaller + CDN-cached.
// Width must be one of Next's default device/image sizes.
const NEXT_IMG_WIDTHS = [256, 384, 640, 750, 828, 1080, 1200, 1920];
export function imgUrl(url?: string | null, w = 640): string | undefined {
  if (!url) return undefined;
  if (!/^https?:\/\//.test(url)) return url;
  const width = NEXT_IMG_WIDTHS.find((x) => x >= w) ?? 1080;
  return `${API_BASE}/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=70`;
}

// ─── Course AI tutor (RAG) — uses the website's /api/ai/chat ───────
export interface AiSource { chapterTitle: string; startMs: number; endMs: number }
export interface AiTurn { role: 'user' | 'assistant'; content: string }

export async function askCourseAI(
  courseId: string,
  message: string,
  history: AiTurn[],
  token: string,
): Promise<{ answer: string; sources: AiSource[] }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courseId, message, history: history.slice(-8) }),
    });
    if (!res.ok) {
      if (res.status === 403) throw new Error('Нет доступа к этому курсу');
      if (res.status === 401) throw new Error('Войдите, чтобы пользоваться ассистентом');
      throw new Error(`Ошибка ${res.status}`);
    }
    const d = await res.json();
    return { answer: d.answer ?? '', sources: d.sources ?? [] };
  } finally {
    clearTimeout(t);
  }
}

// Light markdown -> plain text for chat bubbles.
export function mdToText(s: string): string {
  return (s || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// General Divergents assistant (works without a course; token optional).
export async function askAssistant(
  message: string,
  history: AiTurn[],
  token?: string | null,
  profileContext?: string | null,
): Promise<{ answer: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/mobile/ai`, {
      method: 'POST', signal: ctrl.signal, headers,
      body: JSON.stringify({ message, history: history.slice(-8), profileContext: profileContext || undefined }),
    });
    if (!res.ok) throw new Error(`Ошибка ${res.status}`);
    const d = await res.json();
    return { answer: d.answer ?? '' };
  } finally {
    clearTimeout(t);
  }
}

// ───────── Community challenges (server-backed, admins see applications) ─────────
export interface LiveChallengeTeam { id: string; name: string; capacity: number; captain?: string | null; _count?: { applications: number } }
export interface LiveChallenge {
  id: string; title: string; startISO?: string | null; durationDays: number; price?: string | null; status: string;
  teams: LiveChallengeTeam[]; _count?: { applications: number };
}

export async function fetchLiveChallenges(): Promise<LiveChallenge[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d?.challenges) ? d.challenges : [];
  } catch { return []; } finally { clearTimeout(t); }
}

export async function applyToChallenge(token: string | null, challengeId: string, teamId: string | null): Promise<boolean> {
  if (!token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${challengeId}/apply`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ teamId }),
    });
    return res.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

// ───────── Creator role + create content (challenges/trips/channels) ─────────
export async function fetchMyRole(token: string | null): Promise<{ canCreate: boolean; email?: string | null }> {
  if (!token) return { canCreate: false };
  try {
    const res = await fetch(`${API_BASE}/api/mobile/me/role`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { canCreate: false };
    return await res.json();
  } catch { return { canCreate: false }; }
}

async function postAuthed(path: string, token: string | null, body: any): Promise<boolean> {
  if (!token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

export const createChallenge = (token: string | null, data: any) => postAuthed('/api/mobile/challenges', token, data);
export const createTrip = (token: string | null, data: any) => postAuthed('/api/mobile/trips', token, data);
export const createChannel = (token: string | null, data: any) => postAuthed('/api/mobile/channels', token, data);

export interface LiveTrip { id: string; title: string; region?: string | null; date?: string | null; days: number; price?: string | null; spots: number; difficulty?: string | null; description?: string | null; _count?: { applications: number } }
export async function fetchLiveTrips(): Promise<LiveTrip[]> {
  try { const res = await fetch(`${API_BASE}/api/mobile/trips`); if (!res.ok) return []; const d = await res.json(); return Array.isArray(d?.trips) ? d.trips : []; } catch { return []; }
}
export const applyToTrip = (token: string | null, tripId: string) => postAuthed(`/api/mobile/trips/${tripId}/apply`, token, {});

// ───────── Server channels (Telegram-style): membership, requests, posts ─────────
export interface ServerChannelPost { id: string; type: 'audio' | 'article'; title: string; body?: string | null; audioUrl?: string | null; createdAt: string }
export interface ServerChannel {
  id: string; name: string; handle?: string | null; access: 'open' | 'request' | 'paid'; price?: string | null;
  bio?: string | null; avatarUrl?: string | null; createdBy?: string | null;
  posts: ServerChannelPost[]; _count?: { posts: number; members: number };
}

export async function fetchServerChannels(): Promise<ServerChannel[]> {
  try { const r = await fetch(`${API_BASE}/api/mobile/channels`); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d?.channels) ? d.channels : []; } catch { return []; }
}
export async function joinChannel(token: string | null, id: string): Promise<string | null> {
  if (!token) return null;
  try {
    const r = await fetch(`${API_BASE}/api/mobile/channels/${id}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null; const d = await r.json(); return d?.state ?? null;
  } catch { return null; }
}
export async function fetchMyChannelMemberships(token: string | null): Promise<Record<string, string>> {
  if (!token) return {};
  try {
    const r = await fetch(`${API_BASE}/api/mobile/me/channels`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return {}; const d = await r.json();
    const m: Record<string, string> = {}; (d?.memberships ?? []).forEach((x: any) => { m[x.channelId] = x.state; }); return m;
  } catch { return {}; }
}
export interface ChannelRequest { id: string; userId: string; userEmail: string; userName?: string | null; profile?: any }
export async function fetchChannelRequests(token: string | null, id: string): Promise<ChannelRequest[]> {
  if (!token) return [];
  try { const r = await fetch(`${API_BASE}/api/mobile/channels/${id}/requests`, { headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) return []; const d = await r.json(); return d?.requests ?? []; } catch { return []; }
}
export async function actChannelRequest(token: string | null, id: string, userId: string, action: 'approve' | 'reject'): Promise<boolean> {
  if (!token) return false;
  try { const r = await fetch(`${API_BASE}/api/mobile/channels/${id}/requests`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId, action }) }); return r.ok; } catch { return false; }
}
export async function createChannelPost(token: string | null, id: string, data: { type: 'audio' | 'article'; title: string; body?: string; audioUrl?: string }): Promise<boolean> {
  return postAuthed(`/api/mobile/channels/${id}/posts`, token, data);
}

// ───────── Upload (voice notes) + push token register ─────────
export async function uploadFile(token: string | null, uri: string, name: string, mime: string): Promise<string | null> {
  if (!token) return null;
  try {
    const form = new FormData();
    form.append('file', { uri, name, type: mime } as any);
    const res = await fetch(`${API_BASE}/api/mobile/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form as any });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.url ?? null;
  } catch { return null; }
}
export const registerPush = (token: string | null, expoToken: string, platform: string) =>
  postAuthed('/api/mobile/push/register', token, { token: expoToken, platform });

// ───────── Channel management (owner) ─────────
export interface ChannelMemberRow { id: string; userId: string; userEmail: string; userName?: string | null; state: string }
export const updateChannel = (token: string | null, id: string, data: { name?: string; bio?: string; avatarUrl?: string }) =>
  postAuthedMethod('PATCH', `/api/mobile/channels/${id}`, token, data);
export async function fetchChannelMembers(token: string | null, id: string): Promise<ChannelMemberRow[]> {
  if (!token) return [];
  try { const r = await fetch(`${API_BASE}/api/mobile/channels/${id}/members`, { headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) return []; const d = await r.json(); return d?.members ?? []; } catch { return []; }
}
export async function removeChannelMember(token: string | null, id: string, userId: string): Promise<boolean> {
  if (!token) return false;
  try { const r = await fetch(`${API_BASE}/api/mobile/channels/${id}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId }) }); return r.ok; } catch { return false; }
}
export async function createChannelInvite(token: string | null, id: string): Promise<{ code: string; url: string } | null> {
  if (!token) return null;
  try { const r = await fetch(`${API_BASE}/api/mobile/channels/${id}/invite`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) return null; return await r.json(); } catch { return null; }
}
export async function joinByInvite(token: string | null, code: string): Promise<string | null> {
  if (!token) return null;
  try { const r = await fetch(`${API_BASE}/api/mobile/channels/invite/join`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) }); if (!r.ok) return null; const d = await r.json(); return d?.channelId ?? null; } catch { return null; }
}
async function postAuthedMethod(method: string, path: string, token: string | null, body: any): Promise<boolean> {
  if (!token) return false;
  try { const r = await fetch(`${API_BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); return r.ok; } catch { return false; }
}
