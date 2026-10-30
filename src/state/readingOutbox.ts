import type { ReadingCommand, ReadingReceipt } from '../data/reading';
import { ReadingApiError } from '../data/reading';

export const READING_OUTBOX_KEY = 'dvg.readingOutbox.v1';
type AccountCommands = { accountId: string; commands: ReadingCommand[] };
// Keep the v1 owner and commands at the top level, while retaining pending work
// for signed-out accounts. Switching accounts must not erase or replay it.
export type ReadingQueue = AccountCommands & { otherAccounts?: AccountCommands[] };
/** A queued close is immutable, even when its server receipt is not known yet. */
export function hasPendingReadingClose(queue: ReadingQueue | null, accountId: string, sessionId: string) {
  const own = queue && [queue, ...(queue.otherAccounts ?? [])].find(part => part.accountId === accountId);
  return !!own?.commands.some(command => command.sessionId === sessionId && ['stop', 'report'].includes(command.action));
}
export type ReadingOutboxDependencies = {
  read(): Promise<ReadingQueue | null>;
  write(value: ReadingQueue): Promise<void>;
  send(command: ReadingCommand): Promise<ReadingReceipt>;
  isCurrentAccount(): boolean;
  /** A start the server definitively refused, with the approach's queued close/pages that were dropped with it. */
  onRejectedStart?(start: ReadingCommand, dropped: ReadingCommand[], error: ReadingApiError): Promise<void> | void;
  /** A stop/pages the server definitively refused, with the same approach's commands dropped with it. */
  onRejectedClose?(command: ReadingCommand, dropped: ReadingCommand[], error: ReadingApiError): Promise<void> | void;
  /** Every delivered command with its receipt (e.g. a stop accepted without credit). Failures are ignored. */
  onReceipt?(command: ReadingCommand, receipt: ReadingReceipt): Promise<void> | void;
};
/** Refusals that a later attempt cannot change. `session_pending` is not one: the reader can close the
 * approach open on another device, and the queued approach is then delivered. */
const resolvable = new Set(['session_pending']);
// Only disk read-modify-write belongs under this lock. Network waits must never
// prevent another screen from durably saving time/pages before the app exits.
let journalTail: Promise<unknown> = Promise.resolve();
const uploadTails = new Map<string, Promise<unknown>>();

/** Serialized durable queue. Never delete on transport failure, never cross account boundaries. */
export class ReadingOutbox {
  constructor(private accountId: string, private deps: ReadingOutboxDependencies) {}
  private serialize<T>(action: () => Promise<T>): Promise<T> {
    const result = journalTail.catch(() => {}).then(action);
    journalTail = result;
    return result;
  }
  private async queue() {
    if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
    const q = await this.deps.read();
    if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
    const accounts = q ? [{ accountId: q.accountId, commands: q.commands }, ...(q.otherAccounts ?? [])] : [];
    const own = accounts.find(a => a.accountId === this.accountId);
    const otherAccounts = accounts.filter(a => a.accountId !== this.accountId && a.commands.length);
    return { accountId: this.accountId, commands: own?.commands ?? [], ...(otherAccounts.length ? { otherAccounts } : {}) };
  }
  enqueue(command: ReadingCommand) {
    return this.enqueueMany([command]);
  }
  /** Persist a close and its pages atomically; either all commands exist or none do. */
  enqueueMany(commands: ReadingCommand[]) {
    return this.serialize(async () => {
      const q = await this.queue();
      const next = [...q.commands];
      for (const command of commands) {
        const existing = next.find(c => c.operationId === command.operationId);
        if (existing && JSON.stringify(existing) !== JSON.stringify(command)) throw new Error('Конфликт сохранённого действия');
        if (!existing) next.push(command);
      }
      if (next.length !== q.commands.length) {
        if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
        await this.deps.write({ ...q, commands: next });
      }
    });
  }
  private acknowledge(command: ReadingCommand) {
    return this.serialize(async () => {
      // Re-read after the response: pages or another account's operations may
      // have been saved while the request was in flight. Never overwrite them.
      const q = await this.queue();
      const existing = q.commands.find(c => c.operationId === command.operationId);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(command)) throw new Error('Конфликт сохранённого действия');
      await this.deps.write({ ...q, commands: q.commands.filter(c => c.operationId !== command.operationId) });
    });
  }
  /** A refused start makes its queued stop/pages undeliverable (the server has no such approach).
   * Drop them together so they cannot block later approaches forever; the caller keeps a visible record. */
  private rejectStart(command: ReadingCommand) {
    return this.serialize(async () => {
      const q = await this.queue();
      const dropped = q.commands.filter(c => c.operationId !== command.operationId && c.sessionId === command.sessionId && command.sessionId !== undefined);
      await this.deps.write({ ...q, commands: q.commands.filter(c => c.operationId !== command.operationId && !dropped.includes(c)) });
      return dropped;
    });
  }
  /** A definitively refused stop/pages: drop it (and, for a stop, the approach's pages) so that later
   * approaches are still delivered. The caller keeps a visible record with the time and pages. */
  private rejectClose(command: ReadingCommand) {
    return this.serialize(async () => {
      const q = await this.queue();
      const dropped = command.action === 'stop' ? q.commands.filter(c => c.operationId !== command.operationId
        && c.sessionId === command.sessionId && command.sessionId !== undefined && c.action === 'report') : [];
      await this.deps.write({ ...q, commands: q.commands.filter(c => c.operationId !== command.operationId && !dropped.includes(c)) });
      return dropped;
    });
  }
  flush() {
    // Preserve command order across screens, but do not block a new account or
    // any disk writes on the previous account's transport.
    const result = (uploadTails.get(this.accountId) ?? Promise.resolve()).catch(() => {}).then(async () => {
      const receipts: { command: ReadingCommand; receipt: ReadingReceipt }[] = [];
      while (true) {
        const q = await this.pending();
        if (!q.commands.length) break;
        if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
        const command = q.commands[0];
        let receipt: ReadingReceipt;
        try { receipt = await this.deps.send(command); }
        catch (error) {
          // Transport errors, 401 and 5xx keep everything for a retry. A definitive refusal never
          // blocks the queue: user actions are shown as errors, approaches as visible records.
          if (!(error instanceof ReadingApiError) || ![400, 403, 404, 409].includes(error.status) || !this.deps.isCurrentAccount()) throw error;
          if (['apply', 'review', 'resolve'].includes(command.action)) { await this.acknowledge(command); throw error; }
          // Only the reading API's own refusal (it always names a code) is final for an approach. A 400/403/404
          // from a proxy, firewall or misrouted deploy carries no code: keep everything and retry.
          if (!error.code) throw error;
          if (command.action === 'start' && !resolvable.has(error.code ?? '')) {
            const dropped = await this.rejectStart(command);
            await this.deps.onRejectedStart?.(command, dropped, error);
            continue;
          }
          // Already stopped (another request got through): the pages of this approach still go.
          if (command.action === 'stop' && error.code === 'state') { await this.acknowledge(command); continue; }
          if (command.action === 'stop' || command.action === 'report') {
            const dropped = await this.rejectClose(command);
            await this.deps.onRejectedClose?.(command, dropped, error);
            continue;
          }
          throw error;
        }
        if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
        await this.acknowledge(command);
        receipts.push({ command, receipt });
        try { await this.deps.onReceipt?.(command, receipt); } catch { /* a notice must never stall delivery */ }
      }
      return receipts;
    });
    uploadTails.set(this.accountId, result);
    const cleanup = () => { if (uploadTails.get(this.accountId) === result) uploadTails.delete(this.accountId); };
    void result.then(cleanup, cleanup);
    return result;
  }
  pending() { return this.serialize(() => this.queue()); }
}

export function readingErrorMessage(error: unknown) {
  if (error instanceof ReadingApiError) return error.message;
  if (error instanceof Error && /[А-Яа-яЁё]/.test(error.message)) return error.message;
  return 'Нет подтверждения сервера. Ранее сохранённые действия не удалены; повторим отправку автоматически.';
}
