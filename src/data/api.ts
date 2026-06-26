// Live data client for the Divergents LMS website.
// Talks to the public read-only API added at /api/mobile on divergents-lms.kz.
import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';
import { Course, Lesson } from './courses';

export const API_BASE = 'https://divergents-lms.kz';

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
  const d = decor(c.id);
  return {
    id: c.id,
    title: c.title,
    author: c.category || 'Divergents',
    category: c.category || 'Курсы',
    description: c.description || '',
    lessonsLabel: lessonsLabel(c.chaptersCount),
    chaptersCount: c.chaptersCount,
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
  const d = decor(c.id);
  const lessons: Lesson[] = c.chapters.map((ch, i) => ({
    id: ch.id,
    n: i + 1,
    title: ch.title,
    duration: ch.isFree ? 'Видео · бесплатно' : 'Видео',
    minutes: 0,
    isFree: ch.isFree,
    playbackId: ch.playbackId,
    hlsUrl: ch.hlsUrl,
    description: ch.description,
  }));
  return {
    id: c.id,
    title: c.title,
    author: c.category || 'Divergents',
    category: c.category || 'Курсы',
    description: c.description || '',
    lessonsLabel: lessonsLabel(lessons.length),
    chaptersCount: lessons.length,
    imageUrl: c.imageUrl,
    price: c.price,
    icon: d.icon,
    tint: d.tint,
    iconColor: d.iconColor,
    lessons,
    attachments: c.attachments ?? [],
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
  const list: ApiCourseSummary[] = data?.courses ?? [];
  return list.map(mapSummary);
}

export async function fetchCourseDetail(id: string): Promise<Course> {
  const data: ApiCourseDetail = await getJson(`/api/mobile/courses/${id}`);
  return mapDetail(data);
}

// Format a ₸ price (or "Бесплатно").
export function formatPrice(price: number | null | undefined): string {
  if (price == null || price <= 0) return 'Бесплатно';
  return `${Math.round(price).toLocaleString('ru-RU')} ₸`;
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
  const list: ApiOwnedCourse[] = data?.courses ?? [];
  return list.map((c) => ({ ...mapSummary(c), serverProgress: c.progress, source: 'live' as const }));
}

// Owned course detail (chapters unlocked with Mux HLS for every chapter).
export async function fetchOwnedDetail(id: string, token: string): Promise<Course & { owned: boolean }> {
  const data = await getJsonAuthed(`/api/mobile/me/courses/${id}`, token);
  return { ...mapDetail(data), owned: true };
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

export async function fetchComments(courseId: string, chapterId: string): Promise<ChapterComment[]> {
  try {
    const data = await getJson(`/api/courses/${courseId}/chapters/${chapterId}/comments`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function postComment(
  courseId: string, chapterId: string, content: string, token: string
): Promise<ChapterComment | null> {
  try {
    const res = await fetch(`${API_BASE}/api/courses/${courseId}/chapters/${chapterId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
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
