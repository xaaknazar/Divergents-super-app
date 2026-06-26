// Talentslab integration: the signed-in user's candidate profile, Gallup
// talents, MBTI, Gardner results and report files. Matched by email server-side
// from the Clerk session token. Falls back to a demo profile until the API is live.
import { TALENTSLAB_BASE, TALENTSLAB_APP_KEY } from '../config';

// ─── Types (mirror the Talentslab data model) ──────────────────────
export type GallupDomain = 'executing' | 'influencing' | 'relationship' | 'strategic';

export interface GallupTalent { rank: number; name: string; domain: GallupDomain }
export interface GardnerResult { category: string; score: number } // score 0..100
export interface TalentReport { type: string; title: string; url: string }

export interface ResumeData {
  full_name?: string | null; email?: string | null; phone?: string | null;
  gender?: string | null; marital_status?: string | null; birth_date?: string | null;
  birth_place?: string | null; current_city?: string | null; citizenship?: string | null;
  ready_to_relocate?: boolean; instagram?: string | null;
  religion?: string | null; is_practicing?: boolean; hobbies?: string | null; interests?: string | null;
  visited_countries?: string[]; favorite_sports?: string[]; books_per_year?: string | number | null;
  educational_hours_weekly?: number | null; entertainment_hours_weekly?: number | null;
  social_media_hours_weekly?: number | null; has_driving_license?: boolean;
  school?: string | null; universities?: any[]; language_skills?: any[]; computer_skills?: string | null;
  work_experience?: any[]; total_experience_years?: number | null; job_satisfaction?: number | null;
  desired_position?: string | null; desired_positions?: string[]; activity_sphere?: string | null;
  awards?: any[]; expected_salary?: string | null; employer_requirements?: string | null; family?: string[];
}

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
  mbtiName: string | null;
  resume: ResumeData | null;
  reportsText: string | null;
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
// Graceful "not configured / no auth" result: a found:false profile callers can
// treat as an empty state (or fall back to MOCK_PROFILE) instead of crashing.
export const EMPTY_TALENT_PROFILE: TalentProfile = {
  found: false, fullName: null, email: null, phone: null, currentCity: null,
  photoUrl: null, resumeStep: 0, completeness: 0, mbtiType: null, mbtiName: null,
  resume: null, reportsText: null, gallup: [], gardner: [], reports: [],
};

async function reqJson(path: string, headers: Record<string, string>, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${TALENTSLAB_BASE}${path}`, { signal: ctrl.signal, headers: { Accept: 'application/json', ...headers } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

/**
 * Get the Clerk token to send to Talentslab. Prefers a JWT minted from the
 * 'talentslab' template (which carries an `email` claim) so the server can
 * resolve the user WITHOUT a Clerk secret; falls back to the default session
 * token (server then resolves email via the Clerk Backend API). See the
 * talentslab repo's MOBILE_SETUP.md.
 */
export async function getTalentslabToken(
  getToken: (opts?: { template?: string }) => Promise<string | null>,
): Promise<string | null> {
  try { const t = await getToken({ template: 'talentslab' }); if (t) return t; } catch { /* template not configured */ }
  try { return await getToken(); } catch { return null; }
}

/**
 * GET /api/mobile/profile — Clerk-token auth FIRST (Bearer), then the optional
 * X-App-Key + email fallback (only when an app key is configured). When neither
 * a Clerk token nor an app key is available this resolves to a graceful
 * not-configured result (found:false) instead of throwing, so callers can show
 * an empty/demo state rather than crash.
 */
export async function fetchTalentProfile(token?: string | null, email?: string | null): Promise<TalentProfile> {
  if (token) {
    try {
      const p = normalizeProfile(await reqJson('/api/mobile/profile', { Authorization: `Bearer ${token}` }));
      if (p.found) return p; // only accept the Clerk result if it matched a candidate
    } catch { /* fall through to the optional app-key path */ }
  }
  // Only send X-App-Key when an app key is actually configured (non-empty).
  if (email && TALENTSLAB_APP_KEY) {
    try {
      return normalizeProfile(await reqJson(`/api/mobile/profile?email=${encodeURIComponent(email)}`, { 'X-App-Key': TALENTSLAB_APP_KEY }));
    } catch { /* fall through to graceful not-configured result */ }
  }
  return EMPTY_TALENT_PROFILE;
}

/**
 * POST /api/mobile/resume — Clerk token FIRST, then the optional X-App-Key +
 * email fallback (only when an app key is configured). Never throws: returns
 * false when no auth path succeeds so the UI can stay responsive.
 */
export async function submitResume(token: string | null | undefined, answers: ResumeAnswers, email?: string | null): Promise<boolean> {
  const post = async (headers: Record<string, string>, body: any) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${TALENTSLAB_BASE}/api/mobile/resume`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
        body: JSON.stringify(body),
      });
      return res.ok;
    } finally { clearTimeout(t); }
  };
  if (token) { try { if (await post({ Authorization: `Bearer ${token}` }, { answers })) return true; } catch {} }
  if (email && TALENTSLAB_APP_KEY) { try { return await post({ 'X-App-Key': TALENTSLAB_APP_KEY }, { email, answers }); } catch {} }
  return false;
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
    mbtiName: r?.mbtiName ?? null,
    resume: r?.resume ?? null,
    reportsText: r?.reportsText ?? null,
    gallup: Array.isArray(r?.gallup) ? r.gallup : [],
    gardner: Array.isArray(r?.gardner) ? r.gardner : [],
    reports: Array.isArray(r?.reports) ? r.reports.filter((x: any) => !String(x?.type ?? '').endsWith('_short')) : [],
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
  mbtiName: 'Тренер',
  resume: {
    full_name: 'Aknazar K.', phone: '+7 700 123 45 67', gender: 'Мужской',
    marital_status: 'Женат', birth_date: '14.03.1995', birth_place: 'Алматы',
    current_city: 'Алматы', citizenship: 'Казахстан', ready_to_relocate: true, instagram: '@aknazar',
    hobbies: 'Чтение, бег, шахматы', interests: 'Психология, лидерство, технологии',
    visited_countries: ['Турция', 'ОАЭ', 'Грузия'], favorite_sports: ['Футбол', 'Бег'],
    books_per_year: '24', has_driving_license: true,
    school: 'НИШ, Алматы, 2012', language_skills: ['Казахский — родной', 'Русский — C2', 'Английский — B2'],
    computer_skills: 'Excel, 1С, Notion, BI', work_experience: ['HR-директор · KEX Group · 2023–н.в.', 'HRBP · Choco · 2019–2023'],
    total_experience_years: 8, desired_position: 'Директор по персоналу', activity_sphere: 'HR',
    expected_salary: 'от 1 000 000 ₸', employer_requirements: 'Сильная команда, прозрачные цели',
  },
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
  reportsText: null,
  reports: [
    { type: 'gallup', title: 'Gallup — полный отчёт (34 таланта)', url: 'https://talentslab.kz' },
    { type: 'gallup_short', title: 'Gallup — краткая зона роста', url: 'https://talentslab.kz' },
    { type: 'gardner', title: 'Гарднер — множественный интеллект', url: 'https://talentslab.kz' },
  ],
};

// ─── Gallup theme canonicalization (EN ↔ RU) for talent matching ───
const GALLUP_CANON: Record<string, string> = {};
const _themes: [string, string[]][] = [
  ['achiever', ['достижение']], ['arranger', ['организатор']], ['belief', ['вера']],
  ['consistency', ['последовательность']], ['deliberative', ['рассудительность']],
  ['discipline', ['дисциплина']], ['focus', ['сосредоточенность', 'фокус']],
  ['responsibility', ['ответственность']], ['restorative', ['восстановление']],
  ['activator', ['активатор']], ['command', ['командование']], ['communication', ['коммуникация']],
  ['competition', ['соревнование']], ['maximizer', ['максимизатор']],
  ['self-assurance', ['уверенность в себе']], ['significance', ['значимость']], ['woo', ['обаяние']],
  ['adaptability', ['адаптивность']], ['connectedness', ['взаимосвязанность']], ['developer', ['развитие']],
  ['empathy', ['эмпатия']], ['harmony', ['гармония']], ['includer', ['сопричастность']],
  ['individualization', ['индивидуализация']], ['positivity', ['позитивность']], ['relator', ['близость']],
  ['analytical', ['аналитик', 'аналитика']], ['context', ['контекст']], ['futuristic', ['ориентация на будущее']],
  ['ideation', ['идеация']], ['input', ['сбор информации']], ['intellection', ['интеллект']],
  ['learner', ['обучаемость']], ['strategic', ['стратегия', 'стратег']],
];
for (const [en, ru] of _themes) {
  GALLUP_CANON[en] = en;
  for (const r of ru) GALLUP_CANON[r] = en;
}

export function gallupCanon(name: string): string {
  return GALLUP_CANON[name.trim().toLowerCase()] ?? name.trim().toLowerCase();
}

/** Match a job's required talents against the user's Gallup themes. */
export function talentMatch(jobTalents: string[], userGallup: { name: string }[]) {
  const set = new Set(userGallup.map((g) => gallupCanon(g.name)));
  const items = jobTalents.map((t) => ({ name: t, has: set.has(gallupCanon(t)) }));
  return { items, matched: items.filter((i) => i.has).length, total: items.length };
}

// ─── Resume formatting helpers ─────────────────────────────────────
export function fmtList(v: any): string {
  if (!Array.isArray(v)) return v ? String(v) : '';
  return v.map((it) => {
    if (it && typeof it === 'object') {
      if (it.language) return [it.language, it.level].filter(Boolean).join(' — ');
      if (it.name) return [it.name, it.city, it.graduation_year].filter(Boolean).join(', ');
      if (it.company || it.position) return [it.position, it.company].filter(Boolean).join(' · ');
      return Object.values(it).filter(Boolean).join(' · ');
    }
    return String(it);
  }).filter(Boolean).join(', ');
}

export function resumeRows(r: ResumeData | null): { label: string; value: string }[] {
  if (!r) return [];
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, v: any) => { const val = Array.isArray(v) ? fmtList(v) : (v == null ? '' : String(v)); if (val) rows.push({ label, value: val }); };
  add('Город', r.current_city); add('Телефон', r.phone); add('Дата рождения', r.birth_date);
  add('Пол', r.gender); add('Семейное положение', r.marital_status); add('Гражданство', r.citizenship);
  add('Instagram', r.instagram);
  return rows;
}

// ─── Compact profile summary for the AI assistant ─────────────────
export function profileSummary(p: TalentProfile | null): string {
  if (!p || !p.found) return '';
  const r = p.resume ?? {};
  const lines: string[] = [];
  if (p.fullName) lines.push(`Имя: ${p.fullName}`);
  // age from birth_date dd.mm.yyyy
  if (r.birth_date) {
    const yr = parseInt(String(r.birth_date).split('.').pop() || '', 10);
    if (yr > 1900) lines.push(`Возраст: ~${new Date().getFullYear() - yr}`);
  }
  if (r.current_city) lines.push(`Город: ${r.current_city}`);
  if (r.marital_status) lines.push(`Семейное положение: ${r.marital_status}`);
  const cur = Array.isArray(r.work_experience) ? r.work_experience.find((w: any) => w?.is_current) || r.work_experience[0] : null;
  if (cur && typeof cur === 'object') lines.push(`Работает: ${[cur.position, cur.company].filter(Boolean).join(' в ')}`);
  if (r.desired_position) lines.push(`Желаемая должность: ${r.desired_position}`);
  if (r.total_experience_years) lines.push(`Опыт: ${r.total_experience_years} лет`);
  if (r.activity_sphere) lines.push(`Сфера: ${r.activity_sphere}`);
  if (r.expected_salary) lines.push(`Ожидания по зарплате: ${r.expected_salary}`);
  if (r.language_skills) lines.push(`Языки: ${fmtList(r.language_skills)}`);
  if (p.mbtiType) lines.push(`MBTI: ${p.mbtiName || p.mbtiType}`);
  if (p.gallup.length) lines.push(`Топ таланты Gallup: ${p.gallup.slice(0, 10).map((g) => `${g.rank}. ${g.name}`).join(', ')}`);
  if (p.gardner.length) {
    const top = p.gardner.slice().sort((a, b) => b.score - a.score).slice(0, 4).map((g) => `${g.category} (${g.score}%)`);
    lines.push(`Гарднер: ${top.join(', ')}`);
  }
  if (p.reports.length) lines.push(`Доступные отчёты: ${p.reports.map((x) => x.title).join('; ')}`);
  if (p.reportsText) lines.push(`\nСодержание отчётов Divergents (используй для анализа психотипа и рекомендаций):\n${p.reportsText}`);
  return lines.join('\n');
}
