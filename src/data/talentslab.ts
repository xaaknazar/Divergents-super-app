// Talentslab integration: the signed-in user's candidate profile, Gallup
// talents, MBTI, Gardner results and report files. Matched by email server-side
// from the Clerk session token. Falls back to a demo profile until the API is live.
import { TALENTSLAB_BASE } from '../config';

// ─── Types (mirror the Talentslab data model) ──────────────────────
export type GallupDomain = 'executing' | 'influencing' | 'relationship' | 'strategic';

export interface GallupTalent { rank: number; name: string; domain: GallupDomain }
export interface GardnerResult { category: string; score: number } // score 0..100
export interface TalentReport { type: string; title: string; url: string }

export interface TalentProfile {
  found: boolean;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  currentCity: string | null;
  photoUrl: string | null;
  resumeStep: number;      // 0..5 (5 = completed)
  completeness: number;    // 0..100
  mbtiType: string | null; // e.g. 'INTJ'
  gallup: GallupTalent[];  // up to 34, ranked
  gardner: GardnerResult[];
  reports: TalentReport[];
}

export type ResumeAnswers = Record<string, any>;

// ─── Reference data ────────────────────────────────────────────────
export const GALLUP_DOMAIN_META: Record<GallupDomain, { label: string; color: string }> = {
  executing:    { label: 'Исполнение',        color: '#7C3AED' },
  influencing:  { label: 'Влияние',           color: '#EA580C' },
  relationship: { label: 'Построение отношений', color: '#2563EB' },
  strategic:    { label: 'Стратегическое мышление', color: '#16A34A' },
};

// MBTI type → russian title
export const MBTI_NAMES: Record<string, string> = {
  INTJ: 'Стратег', INTP: 'Учёный', ENTJ: 'Командир', ENTP: 'Полемист',
  INFJ: 'Активист', INFP: 'Посредник', ENFJ: 'Тренер', ENFP: 'Борец',
  ISTJ: 'Администратор', ISFJ: 'Защитник', ESTJ: 'Менеджер', ESFJ: 'Консул',
  ISTP: 'Виртуоз', ISFP: 'Артист', ESTP: 'Делец', ESFP: 'Развлекатель',
};
export const MBTI_TYPES = Object.keys(MBTI_NAMES);
export function mbtiName(t?: string | null): string {
  return t ? MBTI_NAMES[t.toUpperCase()] ?? '' : '';
}

// ─── Client ────────────────────────────────────────────────────────
async function getJson(path: string, token: string | null, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${TALENTSLAB_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

/** GET /api/mobile/profile — candidate resolved by email from the Bearer token. */
export async function fetchTalentProfile(token: string | null): Promise<TalentProfile> {
  const raw = await getJson('/api/mobile/profile', token);
  return normalizeProfile(raw);
}

/** POST /api/mobile/resume — upsert the candidate's resume answers. */
export async function submitResume(token: string | null, answers: ResumeAnswers): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${TALENTSLAB_BASE}/api/mobile/resume`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ answers }),
    });
    return res.ok;
  } finally { clearTimeout(t); }
}

function normalizeProfile(r: any): TalentProfile {
  return {
    found: !!r?.found,
    fullName: r?.fullName ?? null,
    email: r?.email ?? null,
    phone: r?.phone ?? null,
    currentCity: r?.currentCity ?? null,
    photoUrl: r?.photoUrl ?? null,
    resumeStep: Number(r?.resumeStep ?? 0),
    completeness: Number(r?.completeness ?? 0),
    mbtiType: r?.mbtiType ?? null,
    gallup: Array.isArray(r?.gallup) ? r.gallup : [],
    gardner: Array.isArray(r?.gardner) ? r.gardner : [],
    reports: Array.isArray(r?.reports) ? r.reports : [],
  };
}

// ─── Demo profile (fallback until the API is live) ─────────────────
export const MOCK_PROFILE: TalentProfile = {
  found: true,
  fullName: 'Aknazar K.',
  email: null,
  phone: null,
  currentCity: 'Алматы',
  photoUrl: null,
  resumeStep: 5,
  completeness: 100,
  mbtiType: 'ENFJ',
  gallup: [
    { rank: 1, name: 'Достижение', domain: 'executing' },
    { rank: 2, name: 'Командование', domain: 'influencing' },
    { rank: 3, name: 'Стратегия', domain: 'strategic' },
    { rank: 4, name: 'Активатор', domain: 'influencing' },
    { rank: 5, name: 'Индивидуализация', domain: 'relationship' },
    { rank: 6, name: 'Ответственность', domain: 'executing' },
    { rank: 7, name: 'Идеация', domain: 'strategic' },
    { rank: 8, name: 'Коммуникация', domain: 'influencing' },
    { rank: 9, name: 'Вера', domain: 'executing' },
    { rank: 10, name: 'Эмпатия', domain: 'relationship' },
  ],
  gardner: [
    { category: 'Межличностный', score: 92 },
    { category: 'Вербально-лингвистический', score: 84 },
    { category: 'Логико-математический', score: 78 },
    { category: 'Внутриличностный', score: 88 },
    { category: 'Пространственный', score: 64 },
    { category: 'Телесно-кинестетический', score: 58 },
    { category: 'Музыкальный', score: 47 },
    { category: 'Натуралистический', score: 52 },
  ],
  reports: [
    { type: 'gallup', title: 'Gallup — полный отчёт (34 таланта)', url: 'https://talentslab.kz' },
    { type: 'gallup_short', title: 'Gallup — краткая зона роста', url: 'https://talentslab.kz' },
    { type: 'gardner', title: 'Гарднер — множественный интеллект', url: 'https://talentslab.kz' },
  ],
};
