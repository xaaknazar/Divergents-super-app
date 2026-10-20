import { z } from 'zod';
import { API_BASE } from './api';
import { netFetch } from './net';

export const READING_TARGET_MS = 3_600_000;
export const READING_RULES = [
  'Каждый день — 60 минут чтения. Можно разделить час на несколько подходов.',
  'На паузе время не начисляется, выбранные приложения снова доступны. Перед продолжением внесите страницы за подход.',
  'После обязательных 60 минут автоматически начинается дополнительное время. Блокировка остаётся до паузы, завершения или конца дня.',
  'До часа можно только поставить паузу. После часа — поставить паузу или завершить чтение. При остановке укажите страницы за подход.',
  'Для выполненного дня нужны минимум 60 минут и сохранённые страницы. В конце дня учитываются все записанные подходы — отдельная кнопка завершения дня не нужна.',
  'День заканчивается в 00:00 по времени Казахстана (Asia/Almaty). Доставка отчёта — ещё 15 минут, без дополнительных минут чтения.',
  'Один невыполненный день — один красный флаг. Три красных флага суммарно — завершение участия.',
  'Команда видит минуты, страницы и результат дня. Анкеты и личные контакты в рейтингах не публикуются.',
  'Рейтинг команд — доля выполненных дней. Личный рейтинг — выполненные дни, затем страницы.',
  'Блокировка требует разрешения телефона. Владелец может отозвать его; такой сеанс требует проверки, а не автоматического зачёта.',
];
export const CONTINUOUS_READING_RULES = [
  ...READING_RULES.slice(0, 6),
  'Постоянный челлендж без даты окончания. Капитан принимает заявку в свою команду; личная статистика начинается после одобрения.',
  'Пропуск отмечается в истории, но не исключает из челленджа. Можно вернуться к чтению в любой день.',
  'Рейтинг — среднее время чтения в день. Учитываются все календарные дни с одобрения заявки, включая сегодняшний день и пропуски.',
  'Первые 10 календарных дней — период наблюдения. Затем участник попадает в рейтинг. При равном среднем выше тот, кто участвует дольше.',
  'Зелёная зона — в среднем не меньше 60 минут в день. Ниже цели — розовая зона. Страницы и жанр не влияют на место.',
  'История времени, страниц и книг доступна другим пользователям приложения. Анкеты и контакты не публикуются.',
  READING_RULES[9],
];
const phase = z.enum(['upcoming', 'active', 'finished']);
const membership = z.enum(['pending', 'approved', 'rejected']).nullable();
const history = z.object({ day: z.number(), state: z.enum(['complete', 'missed', 'review', 'open', 'future', 'excluded']), pages: z.number(), elapsedMs: z.number() });
const member = z.object({ userId: z.string(), name: z.string(), teamId: z.string(), flags: z.number(), completedDays: z.number(),
  pages: z.number(), elapsedMs: z.number(), extraMs: z.number().default(0), eliminatedOn: z.number().nullable(), history: z.array(history),
  averageMinutes: z.number().optional(), averagePages: z.number().optional(), daysParticipated: z.number().optional(),
  firstDay: z.number().optional(), streak: z.number().optional(), bestStreak: z.number().optional(),
  rankingEligible: z.boolean().optional(), rankingPending: z.boolean().optional(), qualificationDaysLeft: z.number().optional(),
  pace: z.enum(['on_target', 'below_target']).optional() });
const mode = z.enum(['scheduled', 'continuous']).optional();
const catalogItem = z.object({ id: z.string(), title: z.string(), startDate: z.string(), durationDays: z.number(), phase, membership, mode });
export const ReadingCatalogSchema = z.object({ enabled: z.boolean(), challenges: z.array(catalogItem) });
export const ReadingDetailSchema = z.object({ id: z.string(), title: z.string(), startDate: z.string(), durationDays: z.number(), phase, mode,
  currentDay: z.number(), serverNow: z.number(), dayEnd: z.number(), membership, me: member.nullable(), ranking: z.array(member),
  reportedSessionIds: z.array(z.string()),
  session: z.object({ id: z.string(), deviceId: z.string(), day: z.number(), book: z.string(), budgetMs: z.number(),
    author: z.string().nullable().optional(), bookKey: z.string().nullable().optional(), coverId: z.number().nullable().optional(),
    fromPage: z.number().nullable().optional(),
    startedAt: z.string(), elapsedMs: z.number().nullable(), status: z.enum(['running', 'awaiting_pages']) }).nullable(),
  teams: z.array(z.object({ id: z.string(), name: z.string(), capacity: z.number(), captainId: z.string(), occupied: z.number(),
    members: z.number(), completedDays: z.number(), pages: z.number(), completionRate: z.number(), averageMinutes: z.number().optional() })),
  applications: z.array(z.object({ id: z.string(), teamId: z.string(), name: z.string() })),
  reviewDays: z.array(z.object({ userId: z.string(), name: z.string(), day: z.number(), elapsedMs: z.number(), pages: z.number() })).default([]),
});
export type ReadingCatalogItem = z.infer<typeof catalogItem>;
export type ReadingDetail = z.infer<typeof ReadingDetailSchema>;
export type ReadingCommand = { action: string; operationId: string; [key: string]: unknown };
const receipt = z.object({ ok: z.literal(true), challengeId: z.string().optional(), sessionId: z.string().optional(),
  budgetMs: z.number().optional(), serverNow: z.number().optional(), dayEnd: z.number().optional(), review: z.boolean().optional() });
export type ReadingReceipt = z.infer<typeof receipt>;
export class ReadingApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request(token: string | null, id?: string, body?: ReadingCommand): Promise<unknown> {
  if (!token) throw new ReadingApiError('Войдите в аккаунт', 401);
  const response = await netFetch(`${API_BASE}/api/mobile/reading-challenges${id ? `?id=${encodeURIComponent(id)}&v=2` : '?v=2'}`, {
    method: body ? 'POST' : 'GET', retries: 0, timeoutMs: 12_000,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new ReadingApiError(typeof value?.message === 'string' ? value.message : 'Сервер не подтвердил действие', response.status);
  return value;
}
export async function fetchReadingCatalog(token: string | null) { return ReadingCatalogSchema.parse(await request(token)); }
export async function fetchReadingDetail(token: string | null, id: string) { return ReadingDetailSchema.parse(await request(token, id)); }
export async function sendReadingCommand(token: string | null, body: ReadingCommand) { return receipt.parse(await request(token, undefined, body)); }
