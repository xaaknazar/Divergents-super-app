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
};
// Screens for parallel challenges share one disk journal. Serialize across instances,
// including account switches, so one screen cannot overwrite another's pending report.
let journalTail: Promise<unknown> = Promise.resolve();

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
    return this.serialize(async () => {
      const q = await this.queue();
      const existing = q.commands.find(c => c.operationId === command.operationId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(command)) throw new Error('Конфликт сохранённого действия');
      if (!existing) {
        if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
        await this.deps.write({ ...q, commands: [...q.commands, command] });
      }
    });
  }
  flush() {
    return this.serialize(async () => {
      let q = await this.queue();
      const receipts: { command: ReadingCommand; receipt: ReadingReceipt }[] = [];
      while (q.commands.length) {
        if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
        const command = q.commands[0];
        let receipt: ReadingReceipt;
        try { receipt = await this.deps.send(command); }
        catch (error) {
          // A definitive rejected application can be edited/retried. Timing evidence stays durable.
          if (error instanceof ReadingApiError && [400, 403, 404, 409].includes(error.status) && ['apply', 'review', 'resolve', 'start'].includes(command.action)) {
            if (this.deps.isCurrentAccount()) await this.deps.write({ ...q, commands: q.commands.slice(1) });
          }
          throw error;
        }
        if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
        q = { ...q, commands: q.commands.slice(1) };
        await this.deps.write(q);
        receipts.push({ command, receipt });
      }
      return receipts;
    });
  }
  pending() { return this.serialize(() => this.queue()); }
}

export function readingErrorMessage(error: unknown) {
  if (error instanceof ReadingApiError) return error.message;
  if (error instanceof Error && /[А-Яа-яЁё]/.test(error.message)) return error.message;
  return 'Нет подтверждения сервера. Ранее сохранённые действия не удалены; повторим отправку автоматически.';
}
