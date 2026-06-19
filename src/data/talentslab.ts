// Talentslab integration: the signed-in user's candidate profile, Gallup
// talents, MBTI, Gardner results and report files. Matched by email server-side
// from the Clerk session token. Falls back to a demo profile until the API is live.
import { TALENTSLAB_BASE } from '../config';

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
    mbtiName: r?.mbtiName ?? null,
    resume: r?.resume ?? null,
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
