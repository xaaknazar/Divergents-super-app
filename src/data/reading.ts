import { z } from 'zod';
import { API_BASE } from './api';
import { netFetch } from './net';

export const READING_TARGET_MS = 3_600_000;
/** Решение владельца (20.10.2026): «Старт» доступен только после подтверждения книги —
 * ИИ предлагает «Эта книга?», человек выбирает. Одно место, чтобы поменять. */
export const READING_REQUIRE_VERIFIED_BOOK = true;
/** Правила индивидуального Reading challenge (21.10.2026).
 * Сервер рассчитывает средний темп по календарным дням участия, включая пропуски. */
export const READING_CHALLENGE_RULES: { title: string; text: string }[] = [
  { title: 'Каждый сам за себя', text: 'Зачёт индивидуальный: команд, капитанов и заявок нет. Вступить можно в любой день — после согласия с правилами вы сразу участник.' },
  { title: 'Ваш день 1 — день вступления', text: 'Челлендж для каждого начинается в день его вступления. Дни, флаги и темп считаются для каждого участника отдельно.' },
  { title: 'Час чтения в день', text: 'Норма — минимум 60 минут чтения по таймеру в день. Её можно набрать несколькими подходами с паузами.' },
  { title: 'Пауза и страницы', text: 'На паузе время не идёт, ограничения приложений снимаются. Нажмите «Возобновить», чтобы продолжить. Когда за день наберётся 60 минут, можно завершить подход и записать прочитанные страницы — без проверки результата.' },
  { title: 'Дополнительное время', text: 'После 60 минут таймер продолжает считать дополнительное время. Оно тоже записывается, блокировка остаётся до паузы.' },
  { title: 'День заканчивается в 00:00 по Алматы', text: 'Сутки считаются по времени Казахстана (Asia/Almaty). После полуночи начинается следующий день.' },
  { title: 'Красный флаг', text: 'Если к 00:00 за день набрано меньше 60 минут, за этот день ставится красный флаг. Флаг ставит сервер при закрытии дня — в том числе за дни, когда приложение не открывали. Флаги накапливаются.' },
  { title: 'Рейтинг — с первого дня', text: 'Вы попадаете в рейтинг с первого дня участия. Место определяет средний темп: все сохранённые страницы делятся на календарные дни участия, включая дни без чтения. Другие участники видят имя, дни чтения, флаги и темп.' },
  { title: 'Книга и честность', text: 'Название и автора книги вы пишете сами, ИИ проверяет, что такая книга существует. Во время чтения приложения ограничены. Страницы указывайте честно: результат не требует отдельного подтверждения администратором.' },
];
const phase = z.enum(['upcoming', 'active', 'finished']);
const membership = z.enum(['pending', 'approved', 'rejected']).nullable();
const history = z.object({ day: z.number(), state: z.enum(['complete', 'missed', 'review', 'open', 'future', 'excluded']), pages: z.number(), elapsedMs: z.number() });
const member = z.object({ userId: z.string(), name: z.string(), teamId: z.string().nullable().optional(), flags: z.number(), completedDays: z.number(),
  pages: z.number(), elapsedMs: z.number(), extraMs: z.number().default(0), eliminatedOn: z.number().nullable(), history: z.array(history),
  averageMinutes: z.number().optional(), averagePages: z.number().optional(), daysParticipated: z.number().optional(), readingDays: z.number().optional(),
  firstDay: z.number().optional(), streak: z.number().optional(), bestStreak: z.number().optional(),
  rankingEligible: z.boolean().optional(), rankingPending: z.boolean().optional(), qualificationDaysLeft: z.number().optional(),
  pace: z.enum(['on_target', 'below_target']).optional() });
const mode = z.enum(['scheduled', 'continuous']).optional();
const catalogItem = z.object({ id: z.string(), title: z.string(), startDate: z.string(), durationDays: z.number(), phase, membership, mode });
export const ReadingCatalogSchema = z.object({ enabled: z.boolean(), challenges: z.array(catalogItem) });
export const ReadingDetailSchema = z.object({ id: z.string(), title: z.string(), startDate: z.string(), durationDays: z.number(), phase, mode,
  format: z.enum(['individual', 'teams']).optional(), participants: z.number().optional(),
  currentDay: z.number(), serverNow: z.number(), dayEnd: z.number(), membership, me: member.nullable(), ranking: z.array(member),
  reportedSessionIds: z.array(z.string()),
  session: z.object({ id: z.string(), deviceId: z.string(), day: z.number(), book: z.string(), budgetMs: z.number(),
    author: z.string().nullable().optional(), bookKey: z.string().nullable().optional(), coverId: z.number().nullable().optional(),
    fromPage: z.number().nullable().optional(),
    startedAt: z.string(), elapsedMs: z.number().nullable(), status: z.enum(['running', 'awaiting_pages']) }).nullable(),
  teams: z.array(z.object({ id: z.string(), name: z.string(), capacity: z.number(), captainId: z.string(), occupied: z.number(),
    members: z.number(), completedDays: z.number(), pages: z.number(), completionRate: z.number(), averageMinutes: z.number().optional() })).default([]),
  applications: z.array(z.object({ id: z.string(), teamId: z.string().nullable(), name: z.string() })).default([]),
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

type ReadingMemberStats = ReadingDetail['ranking'][number];
/** Дни чтения: дни с сохранённым временем. Старый сервер не присылает readingDays — считаем по той же истории. */
export function readingDaysOf(m: ReadingMemberStats) {
  return m.readingDays ?? m.history.filter(h => h.elapsedMs > 0).length;
}
/** Средний темп в страницах в день — метрика рейтинга. Сервер присылает averagePages. */
export function readingPaceOf(m: ReadingMemberStats) {
  return m.averagePages ?? 0;
}
/** Все участники получают место с первого дня; порядок — средний темп в страницах,
 * затем дольше участие. Сервер сортирует так же; клиент повторяет порядок, чтобы место совпадало. */
export function readingStandings(ranking: ReadingMemberStats[]) {
  return [...ranking]
    .sort((a, b) => readingPaceOf(b) - readingPaceOf(a) || (b.daysParticipated ?? 0) - (a.daysParticipated ?? 0) || a.userId.localeCompare(b.userId))
    .map((member, index) => ({ member, place: index + 1 }));
}
/** «из 48 участников», «из 21 участника». */
export const participantsOf = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'участника' : 'участников'}`;
