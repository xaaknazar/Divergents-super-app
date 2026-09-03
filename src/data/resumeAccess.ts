// Уровни доступа по заполненности анкеты.
//
// Анкета больше не запирает вход в приложение: человек заходит сразу после
// подтверждения почты. Но действия, где его видят и оценивают другие люди,
// требуют заполненных разделов — иначе капитан команды или работодатель
// получает пустую карточку и не может принять решение.
//
//   Сообщество (челлендж, поездка, спорт, каналы) — «Личные данные»,
//   «Дополнительно», «Оценки и тесты».
//   Отклик на вакансию — то же плюс «Образование и опыт».
//
// Gallup желателен, но не обязателен: отчёт есть не у всех, а разбор занимает
// время, и блокировать из-за него нельзя.
import { RESUME_STEPS, ResumeField, ResumeStep } from './resumeSchema';
import { isValidPhone } from './phone';
import { isValidBirthDate } from './birthDate';

export type ResumeArea = 'community' | 'career';

/** Разделы анкеты, нужные для каждого вида действий. */
export const AREA_STEPS: Record<ResumeArea, string[]> = {
  community: ['personal', 'additional', 'assessments'],
  career: ['personal', 'additional', 'education', 'assessments'],
};

export const AREA_TITLE: Record<ResumeArea, string> = {
  community: 'Чтобы подавать заявки в сообществе',
  career: 'Чтобы откликаться на вакансии',
};

/**
 * Не заполнено ли поле. Недописанные значения считаем пустыми: «+7 (777» и
 * «28.10.» сервер отбросит молча, и человек узнает об этом, только когда ему
 * не позвонят.
 */
export function isFieldMissing(field: ResumeField, value: unknown): boolean {
  if (field.key === 'phone') return !isValidPhone(typeof value === 'string' ? value : '');
  if (field.type === 'date') return !isValidBirthDate(typeof value === 'string' ? value : '');
  return value === undefined || value === null || value === ''
    || (Array.isArray(value) && value.length === 0);
}

/** Незаполненные обязательные поля шага. */
export function missingInStep(step: ResumeStep, answers: Record<string, any>): ResumeField[] {
  return step.fields.filter((f) => !f.optional).filter((f) => isFieldMissing(f, answers[f.key]));
}

export interface MissingStep {
  key: string;
  title: string;
  /** Индекс шага — чтобы открыть анкету сразу на нужном месте. */
  index: number;
  fields: ResumeField[];
}

/** Каких разделов не хватает для действия. Пустой массив — можно. */
export function missingForArea(area: ResumeArea, answers: Record<string, any>): MissingStep[] {
  const need = AREA_STEPS[area];
  const out: MissingStep[] = [];
  RESUME_STEPS.forEach((step, index) => {
    if (!need.includes(step.key)) return;
    const fields = missingInStep(step, answers);
    if (fields.length) out.push({ key: step.key, title: step.title, index, fields });
  });
  return out;
}

export function canUseArea(area: ResumeArea, answers: Record<string, any>): boolean {
  return missingForArea(area, answers).length === 0;
}

/** Короткий человеческий текст: чего не хватает и куда идти. */
export function missingSummary(missing: MissingStep[]): string {
  if (!missing.length) return '';
  const parts = missing.map((m) => {
    const names = m.fields.slice(0, 3).map((f) => f.label.toLowerCase());
    const tail = m.fields.length > 3 ? ` и ещё ${m.fields.length - 3}` : '';
    return `• ${m.title}: ${names.join(', ')}${tail}`;
  });
  return parts.join('\n');
}
