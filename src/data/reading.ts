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
  { title: 'Пауза и страницы', text: 'На паузе время не идёт, ограничения приложений снимаются. «Возобновить» продолжает ту же книгу. Чтобы закончить подход или сменить книгу, нажмите «Записать страницы» и сохраните число страниц именно этой книги. Это можно сделать и до 60 минут — без проверки результата.' },
  { title: 'Несколько книг за день', text: 'Добавляйте несколько книг на свою полку заранее. Выбирайте одну книгу для каждого нового подхода — остальные останутся на полке со своим прогрессом. Время всех сохранённых подходов складывается в общую цель 60 минут, а страницы сохраняются отдельно по каждой книге и суммируются за день. Короткий подход сам по себе не закрывает дневную цель.' },
  { title: 'Дополнительное время', text: 'После 60 минут таймер продолжает считать дополнительное время. Оно тоже записывается, блокировка остаётся до паузы.' },
  { title: 'День заканчивается в 00:00 по Алматы', text: 'Сутки считаются по времени Казахстана (Asia/Almaty). После полуночи начинается следующий день.' },
  { title: 'Красный флаг', text: 'Если к 00:00 за день набрано меньше 60 минут, за этот день ставится красный флаг. Флаг ставит сервер при закрытии дня — в том числе за дни, когда приложение не открывали. Флаги накапливаются.' },
  { title: 'Два рейтинга — с первого дня', text: 'Вы попадаете в оба рейтинга с первого дня участия. «Средний темп» — все сохранённые страницы делятся на календарные дни участия, включая дни без чтения. «Всего страниц» — суммарно прочитанные страницы по всем книгам за всё участие в этом челлендже. В каждом рейтинге видно оба показателя. При равном числе страниц выше участник с большим средним темпом; при равном темпе — с большим числом дней участия.' },
  { title: 'Книга и честность', text: 'Название и автора книги вы пишете сами, ИИ проверяет, что такая книга существует. Во время чтения приложения ограничены. Страницы указывайте честно: результат не требует отдельного подтверждения администратором.' },
];
const phase = z.enum(['upcoming', 'active', 'finished']);
const membership = z.enum(['pending', 'approved', 'rejected']).nullable();
const history = z.object({ day: z.number(), state: z.enum(['complete', 'missed', 'review', 'open', 'future', 'excluded']), pages: z.number(), elapsedMs: z.number(),
  flagForgivenOn: z.number().int().positive().optional(), flagForgivenForDay: z.number().int().positive().optional() });
const flagRecovery = z.object({ requiredDays: z.number().int().positive(), progressDays: z.number().int().nonnegative(),
  daysRemaining: z.number().int().nonnegative(), earnedFlags: z.number().int().nonnegative(), forgivenFlags: z.number().int().nonnegative() });
export type ReadingFlagRecoveryState = z.infer<typeof flagRecovery>;
const member = z.object({ userId: z.string(), name: z.string(), teamId: z.string().nullable().optional(), flags: z.number(), completedDays: z.number(),
  pages: z.number(), elapsedMs: z.number(), extraMs: z.number().default(0), eliminatedOn: z.number().nullable(), history: z.array(history),
  averageMinutes: z.number().optional(), averagePages: z.number().optional(), daysParticipated: z.number().optional(), readingDays: z.number().optional(),
  firstDay: z.number().optional(), streak: z.number().optional(), bestStreak: z.number().optional(),
  rankingEligible: z.boolean().optional(), rankingPending: z.boolean().optional(), qualificationDaysLeft: z.number().optional(),
  flagRecovery: flagRecovery.optional(),
  pace: z.enum(['on_target', 'below_target']).optional() });
const mode = z.enum(['scheduled', 'continuous']).optional();
const catalogItem = z.object({ id: z.string(), title: z.string(), startDate: z.string(), durationDays: z.number(), phase, membership, mode });
export const ReadingCatalogSchema = z.object({ enabled: z.boolean(), challenges: z.array(catalogItem) });
export const ReadingBookSummarySchema = z.object({ key: z.string(), title: z.string(), author: z.string(), coverId: z.number().nullable(),
  pages: z.number(), elapsedMs: z.number(), nextPage: z.number().nullable() });
export type ReadingBookSummary = z.infer<typeof ReadingBookSummarySchema>;
export const ReadingDetailSchema = z.object({ id: z.string(), title: z.string(), startDate: z.string(), durationDays: z.number(), phase, mode,
  format: z.enum(['individual', 'teams']).optional(), participants: z.number().optional(),
  flagRecoveryDays: z.number().int().positive().optional(),
  // The server accepts approaches started without internet (start.startedAt), delivered later.
  supportsOfflineStart: z.boolean().optional(),
  /** Server time for this request's nonce, signed by the server: the anchor of the phone's monotonic clock. */
  clock: z.object({ serverNow: z.number(), nonce: z.string(), token: z.string() }).optional(),
  /** The server checks App Attest: the app registers its key so past-day offline starts can be proven. */
  supportsAttest: z.boolean().optional(),
  currentDay: z.number(), serverNow: z.number(), dayEnd: z.number(), membership, me: member.nullable(), ranking: z.array(member),
  reportedSessionIds: z.array(z.string()),
  // Omitted by older servers: do not turn missing data into a misleading empty day.
  todayBooks: z.array(ReadingBookSummarySchema).optional(),
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
  budgetMs: z.number().optional(), serverNow: z.number().optional(), dayEnd: z.number().optional(), review: z.boolean().optional(),
  // Accepted but not credited (e.g. 'overlap': the approach covers minutes of another approach).
  rejected: z.string().optional(), message: z.string().optional() });
export type ReadingReceipt = z.infer<typeof receipt>;
export class ReadingApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
async function request(token: string | null, id?: string, body?: ReadingCommand, clockNonce?: string): Promise<unknown> {
  if (!token) throw new ReadingApiError('Войдите в аккаунт', 401);
  const query = id ? `?id=${encodeURIComponent(id)}&v=2${clockNonce ? `&clockNonce=${encodeURIComponent(clockNonce)}` : ''}` : '?v=2';
  const response = await netFetch(`${API_BASE}/api/mobile/reading-challenges${query}`, {
    method: body ? 'POST' : 'GET', retries: 0, timeoutMs: 12_000,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new ReadingApiError(typeof value?.message === 'string' ? value.message : 'Сервер не подтвердил действие', response.status,
    typeof value?.code === 'string' ? value.code : undefined);
  return value;
}
export async function fetchReadingCatalog(token: string | null) { return ReadingCatalogSchema.parse(await request(token)); }
/** `clockNonce`: a fresh random value; the answer's signed clock is accepted only for this exact nonce. */
export async function fetchReadingDetail(token: string | null, id: string, clockNonce?: string) {
  return ReadingDetailSchema.parse(await request(token, id, undefined, clockNonce));
}
export async function sendReadingCommand(token: string | null, body: ReadingCommand) { return receipt.parse(await request(token, undefined, body)); }

type ReadingMemberStats = ReadingDetail['ranking'][number];
/** Дни чтения: дни с сохранённым временем. Старый сервер не присылает readingDays — считаем по той же истории. */
export function readingDaysOf(m: ReadingMemberStats) {
  return m.readingDays ?? m.history.filter(h => h.elapsedMs > 0).length;
}
/** Средний темп в страницах в день. Сервер присылает averagePages. */
export function readingPaceOf(m: ReadingMemberStats) {
  return m.averagePages ?? 0;
}
export type ReadingRankingMetric = 'pace' | 'pages';
/** Two views of the SAME credited server totals, never a weighted score or a
 * client-side sum of book/history rows. Keep the existing pace order unchanged.
 * All participants rank from day one; final ID ordering makes ties stable. */
export function readingStandings(ranking: ReadingMemberStats[], metric: ReadingRankingMetric = 'pace') {
  return [...ranking]
    .sort((a, b) => (metric === 'pages' ? b.pages - a.pages : 0)
      || readingPaceOf(b) - readingPaceOf(a) || (b.daysParticipated ?? 0) - (a.daysParticipated ?? 0) || a.userId.localeCompare(b.userId))
    .map((member, index) => ({ member, place: index + 1 }));
}
/** «из 48 участников», «из 21 участника». */
export const participantsOf = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'участника' : 'участников'}`;
