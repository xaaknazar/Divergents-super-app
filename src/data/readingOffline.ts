import type { ReadingCommand, ReadingDetail } from './reading';

/** Reading days are calendar days in Asia/Almaty (UTC+5, no DST), the same rule as the server. */
export const READING_DAY_MS = 86_400_000;
const ALMATY_OFFSET_MS = 5 * 3_600_000;
export function readingStartMs(startDate: string) {
  return Date.parse(`${startDate}T00:00:00Z`) - ALMATY_OFFSET_MS;
}
/** Challenge day (1-based) at a moment, by the phone clock. */
export function readingDayAt(startDate: string, at: number) {
  return Math.floor((at - readingStartMs(startDate)) / READING_DAY_MS) + 1;
}
export function readingDayEnd(startDate: string, day: number) {
  return readingStartMs(startDate) + day * READING_DAY_MS;
}

/** Server time this phone last received, with the monotonic clock reading taken right after it. */
export type ReadingClockAnchor = { serverNow: number; uptimeMs: number; bootId: string };
/** Real time from the last server answer plus the monotonic clock. Null after a reboot or without
 * an anchor: then only the phone's own (changeable) date is known. */
export function anchoredNow(anchor: ReadingClockAnchor | null | undefined, clock: { uptimeMs: number; bootId: string } | null | undefined) {
  if (!anchor || !clock || anchor.bootId !== clock.bootId || clock.uptimeMs < anchor.uptimeMs
    || !Number.isFinite(anchor.serverNow) || !Number.isFinite(anchor.uptimeMs)) return null;
  return Math.floor(anchor.serverNow + (clock.uptimeMs - anchor.uptimeMs));
}

/** One approach that exists on this phone but is not yet confirmed by the server. */
export type ReadingLocalApproach = {
  sessionId: string; day: number | null; book: string; author?: string; bookKey?: string; fromPage?: number;
  startedAt?: number; deviceId?: string;
  /** The server has not received the start yet (it was started without internet). */
  startQueued: boolean;
  elapsedMs?: number; pages?: number; nextPage?: number;
  /** Phase on the phone: reading/paused, stopped without pages, or fully saved (stop + pages queued). */
  phase: 'open' | 'stopped' | 'saved';
};

const str = (value: unknown) => typeof value === 'string' ? value : undefined;
const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** Approaches of one challenge reconstructed from the durable outbox, oldest first.
 * The outbox is the evidence; this only reads it. */
export function localApproaches(commands: ReadingCommand[], challengeId: string, detail: ReadingDetail | null): ReadingLocalApproach[] {
  const bySession = new Map<string, ReadingLocalApproach>();
  for (const command of commands) {
    const sessionId = str(command.sessionId);
    if (!sessionId || command.challengeId !== challengeId || !['start', 'stop', 'report'].includes(command.action)) continue;
    let approach = bySession.get(sessionId);
    if (!approach) {
      // Start already delivered: the server (or cached detail) still knows the approach.
      const known = detail?.session?.id === sessionId ? detail.session : null;
      approach = { sessionId, day: known?.day ?? null, book: known?.book ?? '', author: known?.author ?? undefined,
        bookKey: known?.bookKey ?? undefined, fromPage: known?.fromPage ?? undefined, deviceId: known?.deviceId,
        // Stop already delivered, only pages queued: the server copy holds the time.
        elapsedMs: known?.elapsedMs ?? undefined, startQueued: false, phase: 'open' };
      bySession.set(sessionId, approach);
    }
    if (command.action === 'start') {
      const startedAt = num(command.startedAt);
      Object.assign(approach, { startQueued: true, book: str(command.book) ?? approach.book, author: str(command.author),
        bookKey: str(command.bookKey), fromPage: num(command.fromPage), deviceId: str(command.deviceId), startedAt,
        day: startedAt !== undefined && detail ? readingDayAt(detail.startDate, startedAt) : approach.day });
    } else if (command.action === 'stop') {
      approach.elapsedMs = num(command.elapsedMs) ?? 0;
      if (approach.phase === 'open') approach.phase = 'stopped';
    } else {
      approach.pages = num(command.pages) ?? 0; approach.nextPage = num(command.nextPage);
      approach.phase = 'saved';
    }
  }
  return [...bySession.values()];
}

/** What the screen shows when the server copy is stale or some approaches are not delivered yet.
 * `stale` (no fresh server answer): the calendar day follows the phone clock.
 * Approaches saved on the phone are added to their day; an approach started without internet
 * becomes the current session until the server confirms it. Ranking and flags stay the server's. */
export function readingLocalView(detail: ReadingDetail, approaches: ReadingLocalApproach[], now: number, stale: boolean): ReadingDetail {
  let view: ReadingDetail = detail;
  if (stale && detail.mode === 'continuous') {
    const day = Math.max(1, readingDayAt(detail.startDate, now));
    view = { ...view, currentDay: day, dayEnd: readingDayEnd(detail.startDate, day), serverNow: now, phase: 'active' };
  } else if (stale) {
    const day = readingDayAt(detail.startDate, now);
    view = { ...view, currentDay: Math.max(1, Math.min(day, detail.durationDays)), dayEnd: readingDayEnd(detail.startDate, day), serverNow: now,
      phase: day < 1 ? 'upcoming' : day > detail.durationDays ? 'finished' : 'active' };
  }
  if (!approaches.length) return view;
  // Already counted by the server copy (pages delivered, queue not yet cleared): never add twice.
  const counted = new Set(detail.reportedSessionIds ?? []);
  const saved = approaches.filter(a => a.phase === 'saved' && a.day != null && !counted.has(a.sessionId));
  const open = [...approaches].reverse().find(a => a.phase !== 'saved');
  // A session closed on the phone is no longer an open server session in this view.
  let session = view.session && approaches.some(a => a.phase === 'saved' && a.sessionId === view.session!.id) ? null : view.session;
  if (!session && open && open.startQueued && open.day != null && open.startedAt !== undefined) {
    session = { id: open.sessionId, deviceId: open.deviceId ?? '', day: open.day, book: open.book, author: open.author ?? null,
      bookKey: open.bookKey ?? null, fromPage: open.fromPage ?? null, startedAt: new Date(open.startedAt).toISOString(),
      budgetMs: Math.max(0, readingDayEnd(view.startDate, open.day) - open.startedAt),
      elapsedMs: open.phase === 'stopped' ? open.elapsedMs ?? 0 : null, status: open.phase === 'stopped' ? 'awaiting_pages' : 'running' };
  } else if (session && open && open.sessionId === session.id && open.phase === 'stopped' && session.status === 'running') {
    session = { ...session, status: 'awaiting_pages', elapsedMs: open.elapsedMs ?? 0 };
  }
  const addToMember = <M extends NonNullable<ReadingDetail['me']>>(member: M): M => {
    const history = [...member.history];
    let pages = member.pages, elapsedMs = member.elapsedMs;
    for (const approach of saved) {
      const index = history.findIndex(h => h.day === approach.day);
      const add = { pages: approach.pages ?? 0, elapsedMs: approach.elapsedMs ?? 0 };
      pages += add.pages; elapsedMs += add.elapsedMs;
      if (index < 0) history.push({ day: approach.day!, state: 'open', ...add });
      else history[index] = { ...history[index], pages: history[index].pages + add.pages, elapsedMs: history[index].elapsedMs + add.elapsedMs };
    }
    return { ...member, pages, elapsedMs, history: history.map(h => h.state !== 'complete' && h.state !== 'excluded' && h.elapsedMs >= 3_600_000
      && saved.some(a => a.day === h.day) ? { ...h, state: 'complete' as const } : h).sort((a, b) => a.day - b.day) };
  };
  const me = view.me ? addToMember(view.me) : view.me;
  const todaySaved = saved.filter(a => a.day === view.currentDay);
  const todayBooks = view.todayBooks || todaySaved.length ? todaySaved.reduce((books, a) => {
    const key = a.bookKey ?? `local:${a.book}|${a.author ?? ''}`;
    const index = books.findIndex(b => b.key === key);
    const entry = { key, title: a.book, author: a.author ?? '', coverId: null, pages: a.pages ?? 0, elapsedMs: a.elapsedMs ?? 0, nextPage: a.nextPage ?? null };
    if (index < 0) return [...books, entry];
    return books.map((b, i) => i === index ? { ...b, pages: b.pages + entry.pages, elapsedMs: b.elapsedMs + entry.elapsedMs,
      nextPage: entry.nextPage ?? b.nextPage } : b);
  }, [...(view.todayBooks ?? [])]) : view.todayBooks;
  return { ...view, session, me, todayBooks };
}
