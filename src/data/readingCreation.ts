import { z } from 'zod';

export const ReadingChallengeDraftSchema = z.object({
  mode: z.enum(['scheduled', 'continuous']).optional(),
  title: z.string().trim().min(2, 'Введите название: от 2 до 120 символов').max(120, 'Название — не больше 120 символов'),
  startDate: z.string(), durationDays: z.number().int().min(1).max(90),
  teams: z.array(z.object({ name: z.string().trim().min(1).max(80), capacity: z.number().int().min(1).max(100),
    captainNickname: z.string().trim().min(1).max(80) })).min(1).max(30),
});
export type ReadingChallengeDraft = z.infer<typeof ReadingChallengeDraftSchema>;
export const ReadingPublicationSchema = z.object({ operationId: z.string().uuid(), draft: ReadingChallengeDraftSchema });
export type ReadingPublication = z.infer<typeof ReadingPublicationSchema>;
const DAY = 86_400_000, OFFSET = 5 * 3_600_000;
export function readingDateStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const ms = Date.parse(`${value}T00:00:00+05:00`);
  return Number.isFinite(ms) && new Date(ms + OFFSET).toISOString().slice(0, 10) === value ? ms : NaN;
}
export function nextReadingDate(now = Date.now()) { return new Date(now + OFFSET + DAY).toISOString().slice(0, 10); }
export function todayReadingDate(now = Date.now()) { return new Date(now + OFFSET).toISOString().slice(0, 10); }
export function readingDateLabel(value: string) {
  const ms = readingDateStart(value);
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long', year: 'numeric' }) : 'Дата не выбрана';
}
export function readingDateError(value: string, now = Date.now(), mode: 'scheduled' | 'continuous' = 'scheduled') {
  const ms = readingDateStart(value);
  if (mode === 'continuous') return !Number.isFinite(ms) ? 'Выберите дату старта' : value < todayReadingDate(now) ? 'Выберите сегодняшний день или будущую дату' : undefined;
  return !Number.isFinite(ms) ? 'Выберите дату старта' : ms <= now ? 'Старт — с завтрашнего дня, чтобы команды успели подать заявки' : undefined;
}
