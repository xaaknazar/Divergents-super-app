// Career vacancies — API-driven. The catalog is published by the admin on the
// Divergents LMS website and fetched live; there is NO hardcoded/branded seed
// data here. On failure or empty the fetchers resolve to [] / null so screens
// render a proper Russian empty state instead of fake vacancies.
import { T } from '../theme/tokens';
import { API_BASE } from './api';

export interface Job {
  id: string;
  title: string;
  company: string;
  city: string;
  format: 'Офис' | 'Гибрид' | 'Удалёнка';
  salary: string;
  level: string;
  match: number;             // % fit to the user's profile (0 when not scored)
  logo: string;
  color: string;
  reason: string;            // short why-it-fits line
  talents: string[];         // matched Gallup talents
  goodBoss: string;          // the right manager for this role
  goodCompany: string;       // the right culture/company
  requirements: string[];
  about: string;
  postedLabel: string;
}

export const CAREER_FILTERS = ['Под профиль', 'Алматы', 'Удалёнка', 'HR', 'Senior+'];

// Backwards-compat export: some non-career screens still import JOBS. There is
// intentionally no seed data — live vacancies come from the API (see useCareer
// / CareerContext). Kept as an empty array so those screens compile and simply
// show nothing rather than fake/branded content.
export const JOBS: Job[] = [];

// ─── API client ────────────────────────────────────────────────────
interface ApiVacancy {
  id: string;
  title: string;
  company?: string | null;
  city?: string | null;
  format?: string | null;
  salary?: string | null;
  level?: string | null;
  match?: number | null;
  reason?: string | null;
  talents?: string[] | null;
  goodBoss?: string | null;
  goodCompany?: string | null;
  requirements?: string[] | null;
  about?: string | null;
  postedLabel?: string | null;
  logo?: string | null;
  color?: string | null;
}

const FORMATS: Job['format'][] = ['Офис', 'Гибрид', 'Удалёнка'];
const LOGO_PALETTE = [T.brand, T.green, T.indigo, T.brown, T.purple, T.teal, T.orange, T.red];

function decorColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return LOGO_PALETTE[h % LOGO_PALETTE.length];
}

function coerceFormat(f?: string | null): Job['format'] {
  return FORMATS.includes((f ?? '') as Job['format']) ? (f as Job['format']) : 'Офис';
}

function mapVacancy(v: ApiVacancy): Job {
  const company = v.company ?? '';
  return {
    id: String(v.id),
    title: v.title ?? '',
    company,
    city: v.city ?? '',
    format: coerceFormat(v.format),
    salary: v.salary ?? '',
    level: v.level ?? '',
    match: typeof v.match === 'number' && isFinite(v.match) ? Math.max(0, Math.min(100, v.match)) : 0,
    logo: (v.logo ?? company.charAt(0) ?? '·').toUpperCase().slice(0, 1) || '·',
    color: v.color ?? decorColor(String(v.id)),
    reason: v.reason ?? '',
    talents: Array.isArray(v.talents) ? v.talents : [],
    goodBoss: v.goodBoss ?? '',
    goodCompany: v.goodCompany ?? '',
    requirements: Array.isArray(v.requirements) ? v.requirements : [],
    about: v.about ?? '',
    postedLabel: v.postedLabel ?? '',
  };
}

async function reqJson(path: string, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

/** GET /api/mobile/vacancies — live published catalog. Returns [] on failure/empty. */
export async function fetchVacancies(): Promise<Job[]> {
  try {
    const data = await reqJson('/api/mobile/vacancies');
    const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.vacancies) ? data.vacancies : [];
    return list.filter((v) => v && v.id != null).map(mapVacancy);
  } catch {
    return [];
  }
}

/** GET /api/mobile/vacancies/:id — single vacancy. Returns null when missing/unreachable. */
export async function fetchVacancy(id: string): Promise<Job | null> {
  try {
    const data = await reqJson(`/api/mobile/vacancies/${encodeURIComponent(id)}`);
    const v = data?.vacancy ?? data;
    return v && v.id != null ? mapVacancy(v) : null;
  } catch {
    return null;
  }
}

// The Career module's unique value: match by psychotype/talents, not just skills.
// Generic guidance copy (no company branding) — safe to keep client-side.
export const GOOD_FIT = {
  bossTitle: 'Good Boss',
  bossText: 'Руководитель, который ставит цели и даёт автономию, ценит результат и глубину — а не контроль ради контроля.',
  companyTitle: 'Good Company',
  companyText: 'Компания с чёткими процессами и системным подходом, где ваши таланты работают на полную.',
};
