// Talentslab integration: the signed-in user's candidate profile, Gallup
// talents, MBTI, Gardner results and report files. Matched by email server-side
// from the Clerk session token. Falls back to a demo profile until the API is live.
import { TALENTSLAB_BASE } from '../config';
import { loadJSON, saveJSON } from '../state/persist';

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
 * GET /api/mobile/profile — Clerk-token auth only. A shared app key cannot be a
 * mobile credential because every EXPO_PUBLIC value is extractable from the app
 * bundle. Without a Clerk token this returns found:false and never sends an
 * email-address lookup authenticated by a public secret.
 */
export async function fetchTalentProfile(token?: string | null, _email?: string | null): Promise<TalentProfile> {
  if (!token) throw new Error('talentslab_auth_unavailable');
  return normalizeProfile(await reqJson('/api/mobile/profile', { Authorization: `Bearer ${token}` }));
}

/**
 * POST /api/mobile/resume — Clerk token only. Never throws: returns false when
 * the user has no valid session or the request fails, so local retry can handle
 * an offline save without exposing a shared credential in the bundle.
 */
export async function submitResume(token: string | null | undefined, answersIn: ResumeAnswers, _email?: string | null): Promise<boolean> {
  // Compose full_name from parts (Фамилия Имя Отчество) so the Talentslab
  // backend keeps receiving the single field while the UI collects them apart.
  const answers: ResumeAnswers = { ...answersIn };
  const parts = [answers.last_name, answers.first_name, answers.middle_name]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean);
  if (parts.length) answers.full_name = parts.join(' ');
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
  return false;
}

const firstDefined = (...values: any[]) => values.find((value) => value !== undefined && value !== null);
const boolValue = (value: any): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(text)) return true;
  if (['false', '0', 'no'].includes(text)) return false;
  return undefined;
};
const numberValue = (value: any): number => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Resolve Laravel relative storage paths and common photo wrapper shapes. */
export function normalizeTalentPhotoUrl(value: unknown): string | null {
  const candidate = typeof value === 'string'
    ? value
    : value && typeof value === 'object'
      ? firstDefined(
        (value as any).url, (value as any).path, (value as any).src,
        (value as any).original_url, (value as any).originalUrl,
      )
      : null;
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const raw = candidate.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  try {
    const relative = raw.startsWith('/') ? raw : `/${raw.replace(/^\.\//, '')}`;
    return new URL(relative, `${TALENTSLAB_BASE.replace(/\/+$/, '')}/`).toString();
  } catch {
    return null;
  }
}

/** Normalize deployed Laravel variants as well as the documented camelCase contract. */
export function normalizeProfile(response: any): TalentProfile {
  const wrapped = response?.data?.profile ?? response?.profile ?? response?.data ?? response?.candidate ?? response ?? {};
  const pick = (...keys: string[]) => firstDefined(
    ...keys.map((key) => wrapped?.[key]),
    ...keys.map((key) => response?.[key]),
  );
  const resume = pick('resume', 'resume_data', 'answers', 'questionnaire') ?? null;
  const rawStep = numberValue(pick('resumeStep', 'resume_step', 'step'));
  const explicitlyComplete = boolValue(pick('complete', 'completed', 'isComplete', 'is_complete', 'resumeComplete', 'resume_complete')) === true;
  const rawCompleteness = numberValue(pick(
    'completeness', 'completion', 'completionPercent', 'completion_percent',
    'profileCompleteness', 'profile_completeness', 'resumeCompleteness', 'resume_completeness',
  ));
  const completeness = Math.max(0, Math.min(100, explicitlyComplete || rawStep >= 5 ? 100 : rawCompleteness));
  const explicitFound = boolValue(pick('found', 'exists', 'candidateFound', 'candidate_found'));
  const inferredFound = !!firstDefined(
    pick('id', 'candidateId', 'candidate_id'), pick('email'), pick('fullName', 'full_name'),
    resume, rawStep > 0 ? rawStep : undefined, rawCompleteness > 0 ? rawCompleteness : undefined,
  );
  const rawPhoto = firstDefined(
    pick(
      'photoUrl', 'photo_url', 'photo', 'avatarUrl', 'avatar_url', 'avatar',
      'profilePhoto', 'profile_photo', 'profilePicture', 'profile_picture',
      'imageUrl', 'image_url', 'image',
    ),
    resume?.photoUrl, resume?.photo_url, resume?.photo,
    resume?.avatarUrl, resume?.avatar_url, resume?.avatar,
  );
  return {
    found: explicitFound ?? inferredFound,
    fullName: pick('fullName', 'full_name', 'name') ?? null,
    email: pick('email') ?? null,
    phone: pick('phone') ?? null,
    currentCity: pick('currentCity', 'current_city', 'city') ?? null,
    photoUrl: normalizeTalentPhotoUrl(rawPhoto),
    resumeStep: Math.max(0, rawStep),
    completeness,
    mbtiType: pick('mbtiType', 'mbti_type') ?? null,
    mbtiName: pick('mbtiName', 'mbti_name', 'mbti_full_name') ?? null,
    resume,
    reportsText: pick('reportsText', 'reports_text') ?? null,
    gallup: Array.isArray(pick('gallup', 'gallup_talents')) ? pick('gallup', 'gallup_talents') : [],
    gardner: Array.isArray(pick('gardner', 'gardner_results')) ? pick('gardner', 'gardner_results') : [],
    reports: Array.isArray(pick('reports')) ? pick('reports').filter((x: any) => !String(x?.type ?? '').endsWith('_short')) : [],
  };
}

/** Build an offline-safe view model from the locally persisted questionnaire. */
export function profileFromSavedResume(answers: ResumeAnswers | null | undefined, email?: string | null): TalentProfile | null {
  if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) return null;
  const parts = [answers.last_name, answers.first_name, answers.middle_name]
    .map((value) => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean);
  const fullName = parts.join(' ') || (typeof answers.full_name === 'string' ? answers.full_name.trim() : '');
  return {
    ...EMPTY_TALENT_PROFILE,
    found: true,
    fullName: fullName || null,
    email: typeof answers.email === 'string' ? answers.email : email ?? null,
    phone: typeof answers.phone === 'string' ? answers.phone : null,
    currentCity: typeof answers.current_city === 'string' ? answers.current_city : null,
    photoUrl: normalizeTalentPhotoUrl(firstDefined(
      answers.photoUrl, answers.photo_url, answers.photo,
      answers.avatarUrl, answers.avatar_url, answers.avatar,
    )),
    mbtiType: typeof answers.mbti_type === 'string' ? answers.mbti_type : null,
    resume: { ...answers },
  };
}

/** One source of truth for gates and profile progress; empty API data cannot erase local progress. */
export function effectiveResumeCompleteness(profile: TalentProfile | null | undefined, local = 0): number {
  const localPct = Math.max(0, Math.min(100, numberValue(local)));
  if (!profile?.found) return localPct;
  const serverPct = profile.resumeStep >= 5 ? 100 : Math.max(0, Math.min(100, numberValue(profile.completeness)));
  return Math.max(localPct, serverPct);
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

// ─── Editable Gallup order (local-only) ────────────────────────────
// The user can reorder their Gallup talents in the app; the chosen order is
// persisted locally (SecureStore) so the displayed list — and career matching —
// can reflect their priorities. This is a LOCAL preference only: the official
// Talentslab report (PDF) is still generated server-side on the website.
// DEFERRED: server-side report regeneration on talentslab when Gallup changes.
export const GALLUP_ORDER_KEY = 'dvg.gallup.order';

/** Stable id for a talent — its canonical theme key (falls back to the name). */
export function gallupId(g: { name: string }): string {
  return gallupCanon(g.name);
}

/** Load the locally-saved Gallup talent order (list of ids). Empty if unset. */
export function loadGallupOrder(): Promise<string[]> {
  return loadJSON<string[]>(GALLUP_ORDER_KEY, []);
}

/** Persist the chosen Gallup talent order (list of ids) locally. */
export function saveGallupOrder(ids: string[]): Promise<void> {
  return saveJSON(GALLUP_ORDER_KEY, ids);
}

/**
 * Apply a saved id-order to a Gallup array (does not mutate). Talents listed in
 * `order` come first, in that order; any not listed keep their original rank
 * order at the end. Returns the array unchanged when no order is saved.
 */
export function applyGallupOrder(
  gallup: GallupTalent[], order: string[] | null | undefined,
): GallupTalent[] {
  if (!order || order.length === 0) return gallup.slice();
  const idx = new Map(order.map((id, i) => [id, i] as const));
  const pos = (g: GallupTalent) => (idx.has(gallupId(g)) ? idx.get(gallupId(g))! : Number.MAX_SAFE_INTEGER);
  return gallup.slice().sort((a, b) => (pos(a) - pos(b)) || (a.rank - b.rank));
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
  const add = (label: string, v: any) => {
    const val = Array.isArray(v) ? fmtList(v) : (v == null ? '' : String(v));
    if (val && val.trim()) rows.push({ label, value: val.trim() });
  };
  // Личные данные
  add('ФИО', r.full_name);
  add('Телефон', r.phone); add('Email', r.email);
  add('Дата рождения', r.birth_date); add('Место рождения', r.birth_place);
  add('Пол', r.gender); add('Семейное положение', r.marital_status);
  add('Город', r.current_city); add('Гражданство', r.citizenship);
  add('Готов(а) к переезду', r.ready_to_relocate === undefined ? '' : r.ready_to_relocate ? 'Да' : 'Нет');
  add('Instagram', r.instagram);
  // Образование и опыт
  add('Школа', r.school); add('Вузы', r.universities);
  add('Языки', r.language_skills); add('Компьютерные навыки', r.computer_skills);
  add('Опыт работы', r.work_experience);
  add('Общий стаж (лет)', r.total_experience_years);
  add('Удовлетворённость работой', r.job_satisfaction);
  add('Желаемая должность', r.desired_position ?? r.desired_positions);
  add('Сфера деятельности', r.activity_sphere);
  add('Награды и достижения', r.awards);
  add('Ожидания по зарплате', r.expected_salary);
  add('Требования к работодателю', r.employer_requirements);
  // Дополнительно
  add('Религия', r.religion);
  add('Практикующий(ая)', r.is_practicing === undefined ? '' : r.is_practicing ? 'Да' : 'Нет');
  add('Хобби', r.hobbies); add('Интересы', r.interests);
  add('Посещённые страны', r.visited_countries);
  add('Любимые виды спорта', r.favorite_sports);
  add('Книг в год', r.books_per_year);
  add('Часов на обучение в неделю', r.educational_hours_weekly);
  add('Часов на развлечения в неделю', r.entertainment_hours_weekly);
  add('Часов в соцсетях в неделю', r.social_media_hours_weekly);
  add('Водительские права', r.has_driving_license === undefined ? '' : r.has_driving_license ? 'Да' : 'Нет');
  add('Семья', r.family);
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

// ─── Тесты: Gallup (файл) и Гарднер (тест на сайте) ───────────────
export interface TestsStatus {
  gallupUploaded: boolean;
  gallupParsed: boolean;
  gallupFileUrl: string | null;
  gardnerDone: boolean;
}

/** GET /api/mobile/tests-status — есть ли загруженный Gallup и пройден ли Гарднер. */
export async function fetchTestsStatus(token: string | null | undefined): Promise<TestsStatus | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${TALENTSLAB_BASE}/api/mobile/tests-status`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      gallupUploaded: !!d?.gallupUploaded,
      gallupParsed: !!d?.gallupParsed,
      gallupFileUrl: d?.gallupFileUrl ?? null,
      gardnerDone: !!d?.gardnerDone,
    };
  } catch { return null; }
}

/**
 * POST /api/mobile/gallup — загрузить отчёт Gallup (PDF или фото) прямо из
 * приложения. Сервер сохраняет файл кандидату и ставит разбор в очередь, как
 * это делает сайт. Возвращает текст ошибки или null при успехе.
 */
export async function uploadGallupFile(
  token: string | null | undefined,
  file: { uri: string; name: string; mime: string },
): Promise<string | null> {
  if (!token) return 'Нет авторизации';
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name, type: file.mime } as any);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${TALENTSLAB_BASE}/api/mobile/gallup`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
    });
    if (res.ok) return null;
    if (res.status === 404) return 'Анкета не найдена — сначала заполните и сохраните анкету.';
    if (res.status === 422) return 'Файл должен быть PDF или изображением, до 10 МБ.';
    return `Не удалось загрузить (код ${res.status}).`;
  } catch {
    return 'Не удалось загрузить. Проверьте подключение.';
  } finally { clearTimeout(t); }
}

/** Страница теста Гарднера на сайте Talentslab. */
export const GARDNER_TEST_URL = `${TALENTSLAB_BASE.replace(/\/+$/, '')}/gardner-test`;

/**
 * GET /api/mobile/nickname-available — свободен ли псевдоним.
 * Возвращает true/false; при недоступности сети — null (не блокируем ввод).
 */
export async function checkNicknameAvailable(
  token: string | null | undefined,
  nickname: string,
): Promise<boolean | null> {
  if (!token || !nickname) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(
      `${TALENTSLAB_BASE}/api/mobile/nickname-available?nickname=${encodeURIComponent(nickname)}`,
      { signal: ctrl.signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const d = await res.json();
    return !!d?.available;
  } catch { return null; } finally { clearTimeout(t); }
}
