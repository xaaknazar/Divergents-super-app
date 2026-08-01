// Career vacancies — API-driven. The catalog is published by the admin on the
// Divergents LMS website and fetched live; there is NO hardcoded/branded seed
// data here. On failure or empty the fetchers resolve to [] / null so screens
// render a proper Russian empty state instead of fake vacancies.
import { T } from '../theme/tokens';
import { API_BASE } from './api';
import { TalentProfile, normalizeProfile } from './talentslab';

export interface Job {
  id: string;
  title: string;
  // О компании
  company: string;
  companyLogo: string;
  companyValues: string[];
  city: string;
  officeAddress: string;
  // Об условиях
  format: 'Офис' | 'Гибрид' | 'Удалёнка';
  salary: string;
  conditions: string;
  benefits: string[];
  // О требованиях
  experience: string[];              // 'Опыт 1-3 года' | 'Опыт 3-6 лет' | 'Без опыта'
  diplomaRequired: boolean | null;   // да / нет / не указано
  adjacentFields: string;
  otherRequirements: string;
  gallupFile: string;                // Примерный Gallup вакансии (PDF/картинка)
  talents: string[];                 // legacy Gallup talents
  // Card / legacy
  match: number;             // % fit to the user's profile (0 when not scored)
  logo: string;
  color: string;
  reason: string;
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
  companyLogo?: string | null;
  companyValues?: string[] | null;
  city?: string | null;
  officeAddress?: string | null;
  format?: string | null;
  salary?: string | null;
  conditions?: string | null;
  benefits?: string[] | null;
  experience?: string[] | null;
  diplomaRequired?: boolean | null;
  adjacentFields?: string | null;
  otherRequirements?: string | null;
  gallupFile?: string | null;
  talents?: string[] | null;
  match?: number | null;
  reason?: string | null;
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
    companyLogo: v.companyLogo ?? '',
    companyValues: Array.isArray(v.companyValues) ? v.companyValues : [],
    city: v.city ?? '',
    officeAddress: v.officeAddress ?? '',
    format: coerceFormat(v.format),
    salary: v.salary ?? '',
    conditions: v.conditions ?? '',
    benefits: Array.isArray(v.benefits) ? v.benefits : [],
    experience: Array.isArray(v.experience) ? v.experience : [],
    diplomaRequired: typeof v.diplomaRequired === 'boolean' ? v.diplomaRequired : null,
    adjacentFields: v.adjacentFields ?? '',
    otherRequirements: v.otherRequirements ?? '',
    gallupFile: v.gallupFile ?? '',
    talents: Array.isArray(v.talents) ? v.talents : [],
    match: typeof v.match === 'number' && isFinite(v.match) ? Math.max(0, Math.min(100, v.match)) : 0,
    logo: (v.logo ?? company.charAt(0) ?? '·').toUpperCase().slice(0, 1) || '·',
    color: v.color ?? decorColor(String(v.id)),
    reason: v.reason ?? '',
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

/**
 * POST /api/mobile/vacancies/:id/apply — best-effort server-side application.
 * Optional endpoint: the local optimistic "applied" state is the source of
 * truth, so this never throws and resolves false when the sync isn't possible
 * (no auth / unreachable / endpoint not yet implemented).
 */
export async function applyToVacancy(id: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/vacancies/${encodeURIComponent(id)}/apply`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export interface NewVacancy {
  title: string;
  company?: string | null;
  companyLogo?: string | null;
  companyValues?: string[];
  city?: string | null;
  officeAddress?: string | null;
  format?: string | null;
  salary?: string | null;
  conditions?: string | null;
  benefits?: string[];
  experience?: string[];
  diplomaRequired?: boolean | null;
  adjacentFields?: string | null;
  otherRequirements?: string | null;
  gallupFile?: string | null;
  about?: string | null;
  published?: boolean;
}

export type AppStatus = 'pending' | 'approved' | 'rejected';

export interface Applicant {
  id: string;
  applicantUserId: string;
  userEmail: string;
  userName: string;
  status: AppStatus;
  feedback: string;
  date: string;
  profile: TalentProfile | null;
}

export interface MyApplication {
  vacancyId: string;
  title: string;
  company: string;
  status: AppStatus;
  feedback: string;
  date: string;
}

// Format a salary string: if it's plain digits, group thousands + ₸; else as-is.
export function formatSalary(s: string): string {
  const raw = (s ?? '').trim();
  if (!raw) return '';
  const digits = raw.replace(/[\s ]/g, '');
  if (/^\d{4,}$/.test(digits)) return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₸`;
  return raw;
}

/**
 * POST /api/mobile/vacancies — create a vacancy (admin/role-gated). Requires a
 * Clerk token; the server authorizes by role. Returns true on success, false
 * otherwise. Never throws.
 */
export async function createVacancy(token: string | null | undefined, data: NewVacancy): Promise<boolean> {
  if (!token) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/vacancies`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** GET /api/mobile/vacancies/:id/applications — applicants with full profile (owner only). */
export async function fetchApplicants(vacancyId: string, token: string | null | undefined): Promise<Applicant[]> {
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE}/api/mobile/vacancies/${encodeURIComponent(vacancyId)}/applications`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const d = await res.json();
    const list: any[] = Array.isArray(d?.applications) ? d.applications : [];
    return list.map((a) => ({
      id: String(a.id),
      applicantUserId: String(a.applicantUserId ?? ''),
      userEmail: a.userEmail ?? '',
      userName: a.userName ?? '',
      status: (a.status ?? 'pending') as AppStatus,
      feedback: a.feedback ?? '',
      date: a.date ?? '',
      profile: a.profile ? normalizeProfile(a.profile) : null,
    }));
  } catch { return []; }
}

/** PATCH /api/mobile/vacancies/:id/applications — set status + feedback for an applicant. */
export async function decideApplication(
  vacancyId: string,
  applicantUserId: string,
  patch: { status?: AppStatus; feedback?: string },
  token: string | null | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/mobile/vacancies/${encodeURIComponent(vacancyId)}/applications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ applicantUserId, ...patch }),
    });
    return res.ok;
  } catch { return false; }
}

/** GET /api/mobile/me/vacancy-applications — the current user's applications (status + feedback). */
export async function fetchMyVacancyApplications(token: string | null | undefined): Promise<MyApplication[]> {
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE}/api/mobile/me/vacancy-applications`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const d = await res.json();
    const list: any[] = Array.isArray(d?.applications) ? d.applications : [];
    return list.map((a) => ({
      vacancyId: String(a.vacancyId),
      title: a.title ?? '',
      company: a.company ?? '',
      status: (a.status ?? 'pending') as AppStatus,
      feedback: a.feedback ?? '',
      date: a.date ?? '',
    }));
  } catch { return []; }
}

// The Career module's unique value: match by psychotype/talents, not just skills.
// Generic guidance copy (no company branding) — safe to keep client-side.
export const GOOD_FIT = {
  bossTitle: 'Good Boss',
  bossText: 'Руководитель, который ставит цели и даёт автономию, ценит результат и глубину — а не контроль ради контроля.',
  companyTitle: 'Good Company',
  companyText: 'Компания с чёткими процессами и системным подходом, где ваши таланты работают на полную.',
};
