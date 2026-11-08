import { fmtList, ResumeData, ResumeListKey, resumeRows } from './talentslab';

export interface ApplicantResumeSection {
  title: string;
  rows: { label: string; value: string }[];
}
const GROUPS: { title: string; keys: (keyof ResumeData)[] }[] = [
  { title: 'Основная информация', keys: ['birth_date', 'birth_place', 'gender', 'marital_status', 'citizenship', 'ready_to_relocate', 'family', 'has_driving_license'] },
  { title: 'Профессиональные интересы', keys: ['desired_position', 'desired_positions', 'activity_sphere', 'expected_salary', 'employer_requirements'] },
  { title: 'Образование', keys: ['school', 'universities'] },
  { title: 'Опыт работы', keys: ['work_experience', 'total_experience_years', 'job_satisfaction'] },
  { title: 'Награды и достижения', keys: ['awards'] },
  { title: 'Языки и навыки', keys: ['language_skills', 'computer_skills'] },
  { title: 'Интересы и развитие', keys: ['hobbies', 'interests', 'visited_countries', 'favorite_sports', 'books_per_year', 'educational_hours_weekly', 'entertainment_hours_weekly', 'social_media_hours_weekly'] },
  { title: 'Дополнительно', keys: ['religion', 'is_practicing'] },
];
const LIST_LABELS: Record<ResumeListKey, string> = {
  universities: 'Вузы', work_experience: 'Опыт работы', language_skills: 'Языки', awards: 'Награды и достижения',
};

/** Keep every questionnaire field; split lists into entries instead of a comma wall.
 * Identity/contacts are displayed by ApplicantProfileReport's header. */
export function applicantResumeSections(resume: ResumeData | null): ApplicantResumeSection[] {
  if (!resume) return [];
  return GROUPS.flatMap(({ title, keys }) => {
    const subset = Object.fromEntries(keys.map(key => [key, resume[key]])) as ResumeData;
    const rows = resumeRows(subset);
    for (const key of keys) {
      if (!(key in LIST_LABELS)) continue;
      const listKey = key as ResumeListKey;
      const raw = resume[listKey];
      const entries = Array.isArray(raw) && raw.length ? raw : resume.resume_lines?.[listKey];
      if (!entries?.length) continue;
      const value = entries.map(entry => reportEntry(listKey, entry)).filter(Boolean).join('\n\n');
      const index = rows.findIndex(row => row.label === LIST_LABELS[listKey]);
      if (value) {
        const row = { label: LIST_LABELS[listKey], value };
        if (index < 0) rows.push(row); else rows[index] = row;
      }
    }
    return rows.length ? [{ title, rows }] : [];
  });
}

// Talentslab sends both structured entries and older plain-text lists.
// Keep the dates, specialisation and responsibilities that the old flat row omitted.
function reportEntry(key: ResumeListKey, entry: unknown): string {
  if (!entry || typeof entry !== 'object') return fmtList([entry]);
  const item = entry as Record<string, unknown>;
  const text = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const join = (values: unknown[], separator = ' · ') => values.map(text).filter(Boolean).join(separator);
  if (key === 'universities') return join([item.name, item.speciality, item.degree, item.city, item.graduation_year], ', ') || fmtList([entry]);
  if (key !== 'work_experience') return fmtList([entry]);
  const start = text(item.start_date) || join([item.start_month, item.start_year], '.');
  const end = item.is_current === true ? 'по настоящее время' : text(item.end_date) || join([item.end_month, item.end_year], '.');
  const period = join([start, end], ' — ');
  const tasks = Array.isArray(item.main_tasks) ? item.main_tasks.map(text).filter(Boolean) : [];
  const responsibilities = Array.isArray(item.responsibilities) ? item.responsibilities.map(text).filter(Boolean).join('\n') : text(item.responsibilities);
  return [join([item.position, item.company]), join([item.city, item.activity_sphere]), period,
    !period && text(item.years) ? `Стаж: ${text(item.years)}` : '',
    tasks.join('\n'), responsibilities].filter(Boolean).join('\n') || fmtList([entry]);
}
