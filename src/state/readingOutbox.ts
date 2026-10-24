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
// Screens for parallel challenges share one disk journal. Serialize only the short
// read-modify-write of that journal, including across account switches, so one
// screen cannot overwrite another's pending report. Never hold it across a network
// request: a slow upload must not delay saving new local evidence.
let journalTail: Promise<unknown> = Promise.resolve();
// One sender per account: commands go out strictly in order (stop before report),
// and two screens never send the same head command concurrently.
const senders = new Map<string, Promise<unknown>>();
const REJECTABLE = ['apply', 'review', 'resolve', 'start'];

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
  /** Sends queued commands of this account in order. Network waits happen outside the
   * journal lock; a command leaves the journal only after its own receipt. */
  flush() {
    const previous = senders.get(this.accountId) ?? Promise.resolve();
    const run = previous.catch(() => {}).then(() => this.drain());
    const tail = run.catch(() => {});
    senders.set(this.accountId, tail);
    void tail.then(() => { if (senders.get(this.accountId) === tail) senders.delete(this.accountId); });
    return run;
  }
  private async drain() {
    const receipts: { command: ReadingCommand; receipt: ReadingReceipt }[] = [];
    for (;;) {
      const command = await this.serialize(async () => (await this.queue()).commands[0]);
      if (!command) return receipts;
      if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
      let receipt: ReadingReceipt;
      try { receipt = await this.deps.send(command); }
      catch (error) {
        // A definitive rejected application/start can be edited/retried. Timing evidence stays durable.
        if (error instanceof ReadingApiError && [400, 403, 404, 409].includes(error.status) && REJECTABLE.includes(command.action)
          && this.deps.isCurrentAccount()) {
          await this.remove(command.operationId);
        }
        throw error;
      }
      if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
      await this.remove(command.operationId);
      receipts.push({ command, receipt });
    }
  }
  /** Removes exactly the acknowledged operation; commands enqueued meanwhile stay. */
  private remove(operationId: string) {
    return this.serialize(async () => {
      const q = await this.queue();
      const index = q.commands.findIndex(c => c.operationId === operationId);
      if (index < 0) return;
      if (!this.deps.isCurrentAccount()) throw new Error('Аккаунт изменился');
      await this.deps.write({ ...q, commands: q.commands.filter((_, i) => i !== index) });
    });
  }
  pending() { return this.serialize(() => this.queue()); }
}

export function readingErrorMessage(error: unknown) {
  if (error instanceof ReadingApiError) return error.message;
  if (error instanceof Error && /[А-Яа-яЁё]/.test(error.message)) return error.message;
  return 'Нет подтверждения сервера. Ранее сохранённые действия не удалены; повторим отправку автоматически.';
}
