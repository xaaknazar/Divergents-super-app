// Live data client for the Divergents LMS website.
// Talks to the public read-only API added at /api/mobile on divergents-lms.kz.
import { z } from 'zod';
import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';
import { Course, Lesson } from './courses';
import { arrayOf, zId, zStr, zStrN, zNumN } from './contracts/http';

// Single source of truth lives in src/config.ts; imported for internal use and
// re-exported so the many `from './api'` importers keep working without a
// second hardcoded literal.
import { API_BASE } from '../config';
export { API_BASE };

// A Lesson that also carries an optional offline-audio URL (Mux audio.m4a).
// Kept local to avoid touching the shared courses.ts Lesson interface; values
// are read back through `lessonAudioUrl()` so callers stay type-safe.
export type LessonWithAudio = Lesson & { audioUrl?: string | null };

// Safe accessor for a lesson's optional offline-audio URL.
export function lessonAudioUrl(lesson: Lesson): string | null {
  return (lesson as LessonWithAudio).audioUrl ?? null;
}

// ─── Course contracts (GET /api/mobile/courses[/:id], /me/courses[/:id]) ──────
// Zod schemas are the single source of truth for the course API shapes; the raw
// types are inferred via z.infer so they can't drift from the server. Fields are
// lenient (nullish text, string|number ids) so valid rows are never dropped.
const ApiCourseSummarySchema = z.object({
  id: zId,
  title: zStr('Без названия'),
  description: zStrN,
  imageUrl: zStrN,
  price: zNumN,
  category: zStrN,
  categoryId: zStrN,
  chaptersCount: zNumN,
}).passthrough();

const ApiChapterSchema = z.object({
  id: zId,
  title: zStr(''),
  description: zStrN,
  position: zNumN,
  isFree: z.boolean().nullish(),
  playbackId: zStrN,
  hlsUrl: zStrN,
  // Optional Mux audio rendition (audio.m4a) for offline audio downloads.
  // Only present on the owned-course detail endpoint (/api/mobile/me/courses/:id).
  audioUrl: zStrN,
  // Пройдена ли глава — приходит с эндпоинта своего курса.
  completed: z.boolean().nullish(),
}).passthrough();

const ApiAttachmentSchema = z.object({
  id: zId,
  name: zStr(''),
  url: z.string(), // rows without a usable url are dropped by arrayOf
}).passthrough();

const ApiCourseDetailSchema = z.object({
  id: zId,
  title: zStr('Без названия'),
  description: zStrN,
  imageUrl: zStrN,
  price: zNumN,
  category: zStrN,
  attachments: arrayOf(ApiAttachmentSchema, 'attachment'),
  chapters: arrayOf(ApiChapterSchema, 'chapter'),
  progress: z.number().nullish(), // 0..100, present on the owned-course detail endpoint
}).passthrough();

const ApiOwnedCourseSchema = ApiCourseSummarySchema.extend({
  progress: z.number().nullish(),
  owned: z.boolean().nullish(),
});

// Catalog responses arrive as { courses: [...] } or a bare array — normalize both
// to a resilient array (malformed rows dropped, not the whole list).
const courseListPre = (d: unknown) =>
  Array.isArray(d) ? d : (d && Array.isArray((d as { courses?: unknown }).courses) ? (d as { courses: unknown[] }).courses : []);
const CourseListSchema = z.preprocess(courseListPre, arrayOf(ApiCourseSummarySchema, 'course'));
const OwnedListSchema = z.preprocess(courseListPre, arrayOf(ApiOwnedCourseSchema, 'owned course'));

type ApiCourseSummary = z.infer<typeof ApiCourseSummarySchema>;
type ApiChapter = z.infer<typeof ApiChapterSchema>;
type ApiCourseDetail = z.infer<typeof ApiCourseDetailSchema>;
type ApiOwnedCourse = z.infer<typeof ApiOwnedCourseSchema>;

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
    completed: ch.completed === true,
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
  // getJson throws on network/HTTP failure (callers rely on it for the error
  // state); the schema then validates the 200 body — CourseListSchema never
  // throws (non-array → [], malformed rows dropped).
  const data = await getJson('/api/mobile/courses');
  return CourseListSchema.parse(data).map(mapSummary);
}

export async function fetchCourseDetail(id: string): Promise<Course> {
  const data = await getJson(`/api/mobile/courses/${id}`);
  const parsed = ApiCourseDetailSchema.safeParse(data);
  if (!parsed.success && __DEV__) console.warn(`[contracts] /courses/${id} failed validation:`, parsed.error.issues.slice(0, 4));
  // On a validation miss, fall back to the defensive mapper on the raw body so a
  // shape change never turns into a crash — behavior is never worse than before.
  return mapDetail(parsed.success ? parsed.data : (data as ApiCourseDetail));
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

// fetch() with an abort-timeout. React Native's fetch has NO built-in timeout,
// so a stalled socket otherwise hangs the caller — and its loading spinner —
// forever. Every bare network helper below routes through this.
async function timedFetch(url: string, init?: RequestInit, timeoutMs = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function fetchMyCourses(token: string): Promise<Course[]> {
  const data = await getJsonAuthed('/api/mobile/me/courses', token);
  return OwnedListSchema.parse(data).map((c) => ({
    ...mapSummary(c),
    serverProgress: typeof c.progress === 'number' ? c.progress : undefined,
    source: 'live' as const,
  }));
}

// Owned course detail (chapters unlocked with Mux HLS for every chapter).
export async function fetchOwnedDetail(id: string, token: string): Promise<Course & { owned: boolean }> {
  const data = await getJsonAuthed(`/api/mobile/me/courses/${id}`, token);
  const parsed = ApiCourseDetailSchema.safeParse(data);
  if (!parsed.success && __DEV__) console.warn(`[contracts] /me/courses/${id} failed validation:`, parsed.error.issues.slice(0, 4));
  const detail = parsed.success ? parsed.data : (data as ApiCourseDetail);
  return {
    ...mapDetail(detail),
    owned: true,
    ...(typeof detail.progress === 'number' ? { serverProgress: detail.progress } : {}),
  };
}

// Передаём псевдоним из анкеты (Talentslab) на сайт, чтобы он подставлялся в
// комментариях, рецензиях, отзывах о местах и в челлендже. Уникальность
// проверяет Talentslab при сохранении анкеты; здесь 409 означает, что сайт уже
// знает этот псевдоним за другим аккаунтом — молча выходим, анкета не ломается.
//   POST /api/mobile/me/nickname  body { nickname }
export async function syncNicknameToSite(nickname: string, token: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/me/nickname`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nickname }),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Tell the website a lesson/chapter is completed so progress syncs across
// devices. Transient failures are retried and the final result is returned to
// the caller; local completion can still remain available offline. Matches BACKEND.md:
//   POST /api/mobile/me/courses/:id/progress  body { lessonId, completed }
export async function markLessonComplete(
  courseId: string, lessonId: string, token: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(`${API_BASE}/api/mobile/me/courses/${encodeURIComponent(courseId)}/progress`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lessonId, completed: true }),
      });
      if (res.ok) return true;
      // Authentication/validation/not-found errors will not heal on immediate retry.
      if (res.status < 500 && res.status !== 408 && res.status !== 429) return false;
    } catch {
      // Network errors and timeouts get one bounded retry below.
    } finally {
      clearTimeout(timer);
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
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
  // `nickname` — публичное имя автора; ФИО оставлено для инициалов в аватарке.
  user: { id: string; nickname: string | null; firstName: string | null; lastName: string | null };
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
        nickname: typeof c.user?.nickname === 'string' ? c.user.nickname : null,
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
        nickname: typeof c.user?.nickname === 'string' ? c.user.nickname : null,
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
    const d = await res.json().catch(() => null);
    return { answer: d?.answer ?? '', sources: d?.sources ?? [] };
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

// NB: the general Divergents assistant lives in src/data/ai.ts (askAi). A
// duplicate askAssistant() client used to live here with a divergent contract
// and no callers — removed to avoid drift.

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

// `profile` is the applicant's own Talentslab анкета (from useTalentProfile) —
// sent so reviewers reliably see it, independent of the server→Talentslab lookup.
// Возвращает статус и причину отказа: сервер отвечает осмысленными 409
// ('started' | 'pending' | 'approved' | 'team_full') и 400 «No email», а голый
// boolean превращал их все в «проверьте подключение».
export function applyToChallenge(
  token: string | null, challengeId: string, teamId: string | null, profile?: unknown, telegram?: string,
): Promise<PostResult> {
  return requestAuthed('POST', `/api/mobile/challenges/${encodeURIComponent(challengeId)}/apply`, token, {
    teamId,
    ...(telegram ? { telegram } : {}),
    ...(profile ? { profile } : {}),
  });
}

// Человеческая причина отказа в заявке на челлендж.
export function challengeApplyFailureMessage(r: PostResult): { title: string; body: string } {
  if (r.reason === 'team_full') {
    const detail = r.capacity ? ` Все ${r.capacity} мест заняты.` : '';
    return { title: 'В команде нет мест', body: `Пока вы заполняли заявку, команду набрали.${detail} Выберите другую команду.` };
  }
  if (r.reason === 'started') {
    return { title: 'Набор закрыт', body: 'Челлендж уже стартовал — заявки больше не принимаются. Дождитесь следующего потока.' };
  }
  if (r.reason === 'closed') {
    return { title: 'Набор закрыт', body: 'Организатор больше не принимает заявки на этот челлендж.' };
  }
  if (r.reason === 'pending') {
    return { title: 'Заявка уже отправлена', body: 'Она на рассмотрении у капитана. Дождитесь ответа — повторная заявка не нужна.' };
  }
  if (r.reason === 'approved') {
    return { title: 'Вы уже в команде', body: 'Заявка одобрена — подавать её заново не нужно.' };
  }
  if (r.status === 401 || r.reason === 'no-token') {
    return { title: 'Нужен вход', body: 'Войдите в аккаунт, чтобы подать заявку.' };
  }
  if (r.status === 404) {
    return { title: 'Команда не найдена', body: 'Возможно, состав команд изменили. Обновите экран и выберите команду заново.' };
  }
  if (r.status === 400) {
    return { title: 'Нужен подтверждённый email', body: 'В аккаунте нет почты. Добавьте её в профиле и попробуйте снова.' };
  }
  if (r.status === 0) {
    return { title: 'Нет связи', body: 'Проверьте подключение и попробуйте снова.' };
  }
  return { title: 'Не удалось отправить заявку', body: 'Сервер вернул ошибку. Попробуйте позже.' };
}

// Withdraw the signed-in user's own application. Allowed only while it's still
// pending (a rejected one is cleared too). Once approved you're in the team and
// only the captain can remove you — the server answers 409 (reason 'approved').
export async function withdrawChallengeApplication(
  token: string | null, challengeId: string,
): Promise<{ ok: boolean; reason?: 'approved' | 'notfound' | 'error' }> {
  if (!token) return { ok: false, reason: 'error' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/challenges/${encodeURIComponent(challengeId)}/apply`, {
      method: 'DELETE', signal: ctrl.signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, reason: 'approved' };
    if (res.status === 404) return { ok: false, reason: 'notfound' };
    return { ok: false, reason: 'error' };
  } catch { return { ok: false, reason: 'error' }; } finally { clearTimeout(t); }
}

// ───────── Права пользователя и показ разделов ─────────
// `perms` — права по разделам из админ-панели сайта, `features` — какие разделы
// приложения включены. Оба поля появились позже, поэтому необязательные:
// на старом сервере их просто не будет, и приложение работает как раньше.
export interface MyRole {
  canCreate: boolean;
  isAdmin?: boolean;
  email?: string | null;
  perms?: string[];
  features?: Record<string, boolean>;
}

export async function fetchMyRole(token: string | null): Promise<MyRole> {
  if (!token) return { canCreate: false, isAdmin: false };
  // A non-2xx is a legitimate "not an admin" → canCreate:false. A network/timeout
  // error THROWS so the caller (useRole) can retry instead of silently hiding
  // admin controls on a transient blip.
  const res = await timedFetch(`${API_BASE}/api/mobile/me/role`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return { canCreate: false };
  return await res.json();
}

// Результат авторизованного POST/DELETE. Раньше здесь возвращался голый
// boolean, и любой отказ по бизнес-правилу (401 «войдите», 403 «нет прав»,
// 409 «мест нет» / «набор закрыт») экраны показывали как «Проверьте
// подключение» — то есть предлагали чинить интернет вместо реальной причины.
export interface PostResult {
  ok: boolean;
  /** HTTP-статус; 0 — сети не было вовсе (или таймаут). */
  status: number;
  /** Причина из тела ответа: 'full' | 'closed' | 'no-token' | … */
  reason?: string;
  /** Для reason === 'full': вместимость и сколько уже занято. */
  spots?: number;
  taken?: number;
  /** Для reason === 'team_full': вместимость команды в челлендже. */
  capacity?: number;
}

async function requestAuthed(method: 'POST' | 'DELETE', path: string, token: string | null, body?: any): Promise<PostResult> {
  if (!token) return { ok: false, status: 401, reason: 'no-token' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method, signal: ctrl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* пустое / не-JSON тело */ }
    if (!res.ok) {
      return {
        ok: false, status: res.status,
        reason: typeof data?.reason === 'string' ? data.reason : undefined,
        spots: typeof data?.spots === 'number' ? data.spots : undefined,
        taken: typeof data?.taken === 'number' ? data.taken : undefined,
        capacity: typeof data?.capacity === 'number' ? data.capacity : undefined,
      };
    }
    return { ok: true, status: res.status, reason: typeof data?.status === 'string' ? data.status : undefined };
  } catch { return { ok: false, status: 0, reason: 'network' }; } finally { clearTimeout(t); }
}

// Человеческая причина отказа для алерта «не удалось записаться». Возвращает
// именно то, что произошло, вместо универсального «проверьте подключение».
export function joinFailureMessage(r: PostResult): { title: string; body: string } {
  if (r.reason === 'full') {
    const detail = r.spots ? ` Все ${r.spots} мест заняты.` : '';
    return { title: 'Свободных мест нет', body: `Набор уже заполнен.${detail} Попробуйте следующую поездку или напишите организатору.` };
  }
  if (r.reason === 'closed') {
    return { title: 'Набор закрыт', body: 'Организатор больше не принимает заявки.' };
  }
  if (r.status === 401 || r.reason === 'no-token') {
    return { title: 'Нужен вход', body: 'Войдите в аккаунт, чтобы записаться.' };
  }
  if (r.status === 403) {
    return { title: 'Нет доступа', body: 'У вашего аккаунта нет прав на это действие.' };
  }
  if (r.status === 404) {
    return { title: 'Событие не найдено', body: 'Возможно, его сняли с публикации.' };
  }
  if (r.status === 400) {
    return { title: 'Не удалось записаться', body: 'Заполните профиль (нужен подтверждённый email) и попробуйте снова.' };
  }
  if (r.status === 0) {
    return { title: 'Нет связи', body: 'Проверьте подключение и попробуйте снова.' };
  }
  return { title: 'Не удалось записаться', body: 'Сервер вернул ошибку. Попробуйте позже.' };
}

// Тонкая обёртка для вызовов, которым важен только факт успеха.
async function postAuthed(path: string, token: string | null, body: any): Promise<boolean> {
  return (await requestAuthed('POST', path, token, body)).ok;
}

export const createChallenge = (token: string | null, data: any) => postAuthed('/api/mobile/challenges', token, data);
export const createTrip = (token: string | null, data: any) => postAuthed('/api/mobile/trips', token, data);
export const createChannel = (token: string | null, data: any) => postAuthed('/api/mobile/channels', token, data);

export interface LiveTrip { id: string; title: string; region?: string | null; date?: string | null; days: number; price?: string | null; spots: number; difficulty?: string | null; description?: string | null; meetPlace?: string | null; meetLat?: number | null; meetLng?: number | null; meetAt?: string | null; _count?: { applications: number } }

// ───────── Мои записи на офлайн-события (заявка ≠ участие) ─────────
// 'pending'  — заявка отправлена, организатор ещё не ответил;
// 'approved' — человек действительно записан (для спорта это статус 'going').
// Отклонённые и отменённые записи сервер не отдаёт вовсе.
export type EnrollStatus = 'pending' | 'approved';
export interface MyEnrollment { id: string; status: EnrollStatus }

// Сервер может прислать словарь поездок (pending|approved) или спорта
// (going|cancelled) — приводим к одному типу, неизвестное отбрасываем.
function normalizeEnrollments(raw: unknown, legacyIds: unknown): MyEnrollment[] {
  if (Array.isArray(raw)) {
    return raw
      .map((x: any): MyEnrollment | null => {
        const id = x?.id != null ? String(x.id) : '';
        if (!id) return null;
        const s = String(x?.status ?? '');
        if (s === 'pending') return { id, status: 'pending' };
        if (s === 'approved' || s === 'going') return { id, status: 'approved' };
        return null;
      })
      .filter((x): x is MyEnrollment => x !== null);
  }
  // Старый сервер отдаёт только массив id и статусов не знает — считаем такие
  // записи подтверждёнными, как приложение вело себя и раньше.
  if (Array.isArray(legacyIds)) {
    return legacyIds.filter((x) => x != null).map((x) => ({ id: String(x), status: 'approved' as const }));
  }
  return [];
}

export async function fetchMyTrips(token: string | null): Promise<MyEnrollment[]> {
  if (!token) return [];
  try {
    const r = await timedFetch(`${API_BASE}/api/mobile/me/trips`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return [];
    const d = await r.json();
    return normalizeEnrollments(d?.trips, d?.tripIds);
  } catch { return []; }
}
export async function fetchLiveTrips(): Promise<LiveTrip[]> {
  try { const res = await timedFetch(`${API_BASE}/api/mobile/trips`); if (!res.ok) return []; const d = await res.json(); return Array.isArray(d?.trips) ? d.trips : []; } catch { return []; }
}
export const applyToTrip = (token: string | null, tripId: string): Promise<PostResult> =>
  requestAuthed('POST', `/api/mobile/trips/${encodeURIComponent(tripId)}/apply`, token, {});

// ───────── Server channels (Telegram-style): membership, requests, posts ─────────
export interface ServerChannelPost { id: string; type: 'audio' | 'article'; title: string; body?: string | null; audioUrl?: string | null; createdAt: string; reactions?: Record<string, number>; myReaction?: string | null }

// Toggle a reaction on a channel post. Returns the updated counts + the user's
// current reaction, or null on failure. Server set: 👍 ❤️ 🔥 👏 🙏.
export async function reactChannelPost(token: string | null, channelId: string, postId: string, emoji: string): Promise<{ reactions: Record<string, number>; myReaction: string | null } | null> {
  if (!token) return null;
  try {
    const r = await timedFetch(`${API_BASE}/api/mobile/channels/${channelId}/posts/${postId}/react`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return { reactions: d?.reactions ?? {}, myReaction: d?.myReaction ?? null };
  } catch { return null; }
}
export interface ServerChannel {
  id: string; name: string; handle?: string | null; access: 'open' | 'request' | 'paid'; price?: string | null;
  bio?: string | null; avatarUrl?: string | null; createdBy?: string | null;
  posts: ServerChannelPost[]; _count?: { posts: number; members: number };
}

export async function fetchServerChannels(): Promise<ServerChannel[]> {
  try { const r = await timedFetch(`${API_BASE}/api/mobile/channels`); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d?.channels) ? d.channels : []; } catch { return []; }
}
export async function joinChannel(token: string | null, id: string): Promise<string | null> {
  if (!token) return null;
  try {
    const r = await timedFetch(`${API_BASE}/api/mobile/channels/${id}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null; const d = await r.json(); return d?.state ?? null;
  } catch { return null; }
}
export async function fetchMyChannelMemberships(token: string | null): Promise<Record<string, string>> {
  if (!token) return {};
  try {
    const r = await timedFetch(`${API_BASE}/api/mobile/me/channels`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return {}; const d = await r.json();
    const m: Record<string, string> = {}; (d?.memberships ?? []).forEach((x: any) => { m[x.channelId] = x.state; }); return m;
  } catch { return {}; }
}
export interface ChannelRequest { id: string; userId: string; userEmail: string; userName?: string | null; profile?: any }
export async function fetchChannelRequests(token: string | null, id: string): Promise<ChannelRequest[]> {
  if (!token) return [];
  try { const r = await timedFetch(`${API_BASE}/api/mobile/channels/${id}/requests`, { headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) return []; const d = await r.json(); return d?.requests ?? []; } catch { return []; }
}
export async function actChannelRequest(token: string | null, id: string, userId: string, action: 'approve' | 'reject'): Promise<boolean> {
  if (!token) return false;
  try { const r = await timedFetch(`${API_BASE}/api/mobile/channels/${id}/requests`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId, action }) }); return r.ok; } catch { return false; }
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
    const res = await timedFetch(`${API_BASE}/api/mobile/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form as any }, 30000);
    if (!res.ok) return null;
    const d = await res.json();
    return d?.url ?? null;
  } catch { return null; }
}
export const registerPush = (token: string | null, expoToken: string, platform: string, city?: string | null, country?: string | null) =>
  postAuthed('/api/mobile/push/register', token, { token: expoToken, platform, ...(city ? { city } : {}), ...(country ? { country } : {}) });

// Update the signed-in user's city on their push tokens so offline events
// (trips/sport) can be pushed "по месту". Called when the user's city changes.
export const updateMyLocation = (token: string | null, country: string, city: string) =>
  postAuthed('/api/mobile/me/location', token, { country, city });

// Remove this device's Expo token on sign-out so the previous account stops
// receiving pushes on a shared device.
export const unregisterPush = (token: string | null, expoToken: string) =>
  postAuthed('/api/mobile/push/unregister', token, { token: expoToken });

// ───────── Channel management (owner) ─────────
export interface ChannelMemberRow { id: string; userId: string; userEmail: string; userName?: string | null; state: string }
export const updateChannel = (token: string | null, id: string, data: { name?: string; bio?: string; avatarUrl?: string; handle?: string; access?: 'open' | 'request' }) =>
  postAuthedMethod('PATCH', `/api/mobile/channels/${id}`, token, data);
// Owner-only: permanently delete the channel (server also removes its posts/members).
export const deleteChannel = (token: string | null, id: string) =>
  postAuthedMethod('DELETE', `/api/mobile/channels/${id}`, token, {});

// Delete a challenge (creator/admin only, enforced server-side). Cascades its
// teams/applications/tasks.
export const deleteChallenge = (token: string | null, id: string) =>
  postAuthedMethod('DELETE', `/api/mobile/challenges/${id}`, token, {});
// Owner-only: delete a single post from the channel.
export const deleteChannelPost = (token: string | null, id: string, postId: string) =>
  postAuthedMethod('DELETE', `/api/mobile/channels/${id}/posts/${postId}`, token, {});
export async function fetchChannelMembers(token: string | null, id: string): Promise<ChannelMemberRow[]> {
  if (!token) return [];
  try { const r = await timedFetch(`${API_BASE}/api/mobile/channels/${id}/members`, { headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) return []; const d = await r.json(); return d?.members ?? []; } catch { return []; }
}
export async function removeChannelMember(token: string | null, id: string, userId: string): Promise<boolean> {
  if (!token) return false;
  try { const r = await timedFetch(`${API_BASE}/api/mobile/channels/${id}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId }) }); return r.ok; } catch { return false; }
}
export async function createChannelInvite(token: string | null, id: string): Promise<{ code: string; url: string } | null> {
  if (!token) return null;
  try { const r = await timedFetch(`${API_BASE}/api/mobile/channels/${id}/invite`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) return null; return await r.json(); } catch { return null; }
}
export async function joinByInvite(token: string | null, code: string): Promise<string | null> {
  if (!token) return null;
  try { const r = await timedFetch(`${API_BASE}/api/mobile/channels/invite/join`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) }); if (!r.ok) return null; const d = await r.json(); return d?.channelId ?? null; } catch { return null; }
}
async function postAuthedMethod(method: string, path: string, token: string | null, body: any): Promise<boolean> {
  if (!token) return false;
  try { const r = await timedFetch(`${API_BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); return r.ok; } catch { return false; }
}

// One-time Clerk sign-in token → open the website already authenticated.
export async function getSignInTicket(token: string | null): Promise<string | null> {
  if (!token) return null;
  try {
    const r = await timedFetch(`${API_BASE}/api/mobile/signin-ticket`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null; const d = await r.json(); return d?.token ?? null;
  } catch { return null; }
}
// Build a website URL that auto-signs-in via the ticket, then lands on `path`.
export function webAuthedUrl(ticket: string | null, path: string): string {
  if (ticket) return `${API_BASE}/sign-in?__clerk_ticket=${encodeURIComponent(ticket)}&redirect_url=${encodeURIComponent(path)}`;
  return `${API_BASE}${path}`;
}

// ───────── Sport (server) ─────────
export interface LiveSport { id: string; title: string; place?: string | null; date?: string | null; spots: number; description?: string | null; meetLat?: number | null; meetLng?: number | null; meetAt?: string | null; _count?: { applications: number } }
export async function fetchMySport(token: string | null): Promise<MyEnrollment[]> {
  if (!token) return [];
  try {
    const r = await timedFetch(`${API_BASE}/api/mobile/me/sport`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return [];
    const d = await r.json();
    return normalizeEnrollments(d?.sport, d?.sportIds);
  } catch { return []; }
}
export async function fetchLiveSport(): Promise<LiveSport[]> {
  try { const r = await timedFetch(`${API_BASE}/api/mobile/sport`); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d?.sport) ? d.sport : []; } catch { return []; }
}
export const createSport = (token: string | null, data: any) => postAuthed('/api/mobile/sport', token, data);
export const joinSport = (token: string | null, id: string): Promise<PostResult> =>
  requestAuthed('POST', `/api/mobile/sport/${encodeURIComponent(id)}/join`, token, {});
// Отмена участия. Без неё «отмена» жила только в телефоне: строка оставалась
// `going`, а следующий запуск возвращал кнопку в «Вы идёте».
export const leaveSport = (token: string | null, id: string): Promise<PostResult> =>
  requestAuthed('DELETE', `/api/mobile/sport/${encodeURIComponent(id)}/join`, token);
