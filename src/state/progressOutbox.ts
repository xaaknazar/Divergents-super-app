// No network/platform dependencies: the same persisted command is retried verbatim.
import type { Challenge, ProgressResult } from '../data/community';

export interface ProgressOperation {
  challengeId: string; day: number; taskId: string;
  operationId: string; expectedVersion: number; value?: number; done?: boolean;
  blocked?: string;
}
export interface ConfirmedProgress {
  challengeId: string; day: number; taskId: string; version: number; value: number; done: boolean;
}
export interface ProgressOutboxState {
  ownerId: string; operations: ProgressOperation[]; confirmed: ConfirmedProgress[];
}
const sameTask = (a: { challengeId: string; day: number; taskId: string }, b: typeof a) =>
  a.challengeId === b.challengeId && a.day === b.day && a.taskId === b.taskId;

export class ProgressOutbox {
  state: ProgressOutboxState;
  private running = false;
  private disposed = false;
  // Backoff belongs to an operation, not to the whole queue. A failed reading
  // request must not prevent steps/no-sugar from reaching the server.
  private retries = new Map<string, { at: number; failures: number; reason: string }>();
  private attempted = new Set<string>();
  constructor(ownerId: string, restored: ProgressOutboxState | null, private io: {
    save: (state: ProgressOutboxState) => Promise<void>;
    send: (operation: ProgressOperation) => Promise<ProgressResult>;
    changed: (state: ProgressOutboxState, error?: string) => void;
    uuid: () => string;
  }) {
    if (restored?.ownerId === ownerId && (!Array.isArray(restored.operations) || !Array.isArray(restored.confirmed))) {
      throw new Error('Invalid stored progress queue');
    }
    this.state = restored?.ownerId === ownerId ? { ...restored, operations: [...restored.operations].sort((a, b) =>
      a.challengeId.localeCompare(b.challengeId) || a.day - b.day || a.taskId.localeCompare(b.taskId) || a.expectedVersion - b.expectedVersion
    ) } : { ownerId, operations: [], confirmed: [] };
    // After a restart every restored operation may already have reached the server.
    this.state.operations.forEach((o) => this.attempted.add(o.operationId));
  }
  dispose() { this.disposed = true; }
  /** A failure in one challenge must not label another challenge's marks as failed. */
  issueFor(challengeId: string): string | null {
    const outstanding = this.state.operations.find(o => o.challengeId === challengeId
      && (o.blocked || this.retries.has(o.operationId)));
    return outstanding?.blocked ?? (outstanding ? this.retries.get(outstanding.operationId)?.reason : null) ?? null;
  }
  private async persist() {
    // Capture an immutable snapshot BEFORE awaiting the storage implementation.
    await this.io.save(JSON.parse(JSON.stringify(this.state)));
  }
  private publish(error?: string) {
    const outstanding = this.state.operations.find(o => o.blocked || this.retries.has(o.operationId));
    if (!this.disposed) this.io.changed(this.state, error ?? outstanding?.blocked
      ?? (outstanding ? this.retries.get(outstanding.operationId)?.reason : undefined));
  }
  enqueue(input: Omit<ProgressOperation, 'operationId' | 'blocked'>) {
    if (this.disposed) return;
    const previous = this.state.operations.filter((o) => sameTask(o, input) && !o.blocked);
    const tail = previous[previous.length - 1];
    // Coalesce only commands that have NEVER been attempted. An uncertain request
    // retains its ID and payload forever; a rapid series of taps need not send 100 writes.
    const replace = tail && !this.attempted.has(tail.operationId) ? tail : null;
    const operation = { ...input, operationId: this.io.uuid(),
      expectedVersion: replace ? replace.expectedVersion : tail ? tail.expectedVersion + 1 : input.expectedVersion };
    this.state = { ...this.state,
      operations: [...this.state.operations.filter((o) => o.operationId !== replace?.operationId && !(sameTask(o, input) && o.blocked)), operation] };
    this.publish();
    // Even when another command is in flight, persist every new click immediately.
    void this.persist().then(() => this.flush()).catch(() => this.publish('storage'));
  }
  private remember(value: ConfirmedProgress) {
    const old = this.state.confirmed.find((r) => sameTask(r, value));
    if (old && old.version > value.version) return;
    this.state = { ...this.state, confirmed: [
      ...this.state.confirmed.filter((r) => !sameTask(r, value)), value,
    ] };
  }
  async flush() {
    if (this.disposed || this.running) return;
    this.running = true;
    try {
      for (;;) {
        if (this.disposed) return;
        const operation = this.state.operations.find((o, i, operations) => !o.blocked
          && (this.retries.get(o.operationId)?.at ?? 0) <= Date.now()
          // Dependent edits cannot overtake their uncertain predecessor.
          && !operations.slice(0, i).some(previous => sameTask(previous, o)));
        if (!operation) return;
        // No network write before durable local storage has succeeded.
        await this.persist();
        if (this.disposed) return;
        // A newer unsent value may have replaced this operation while storage was pending.
        if (!this.state.operations.some((o) => o.operationId === operation.operationId)) continue;
        this.attempted.add(operation.operationId);
        // Includes authentication/token refresh exceptions. Disk errors alone
        // reach the outer catch; a transport exception is not "disk full".
        const result = await this.io.send(operation).catch((): ProgressResult => ({ ok: false, status: 0, reason: 'network' }));
        if (this.disposed) return;
        if (result.ok && result.version === operation.expectedVersion + 1
          && result.savedValue !== undefined && result.savedDone !== undefined) {
          this.remember({ challengeId: operation.challengeId, day: operation.day, taskId: operation.taskId,
            version: result.version, value: result.savedValue, done: result.savedDone });
          this.state = { ...this.state, operations: this.state.operations.filter((o) => o.operationId !== operation.operationId) };
          this.retries.delete(operation.operationId);
          await this.persist();
          this.publish();
          continue;
        }
        if (result.status >= 400 && result.status < 500 && result.status !== 408 && result.status !== 429 && result.status !== 401) {
          if (result.current) this.remember(result.current);
          // Never rebase stale values onto the newly returned version automatically.
          this.state = { ...this.state, operations: this.state.operations.map((o) =>
            sameTask(o, operation) ? { ...o, blocked: result.reason ?? 'rejected' } : o) };
          await this.persist();
          this.publish(result.reason ?? 'rejected');
          continue;
        }
        const failures = Math.min(5, (this.retries.get(operation.operationId)?.failures ?? 0) + 1);
        const delay = Math.min(150000, 20000 * 2 ** (failures - 1));
        this.retries.set(operation.operationId, {
          at: Date.now() + delay + Math.random() * delay, failures,
          reason: result.reason ?? (result.status === 401 ? 'authentication' : result.status >= 500 ? 'server' : 'network'),
        });
        this.publish();
        // Continue with another task, but never retry this operation in a loop.
      }
    } catch {
      this.publish('storage');
    } finally { this.running = false; }
  }
}

export function mergeProgressOutbox(challenge: Challenge, state: ProgressOutboxState | null): Challenge {
  if (!state) return challenge;
  return { ...challenge, tasks: challenge.tasks.map((task) => {
    const scope = { challengeId: challenge.id, day: challenge.currentDay, taskId: task.id };
    const confirmed = state.confirmed.find((r) => sameTask(r, scope));
    let result = task;
    if (confirmed && confirmed.version >= (task.version ?? 0)) result = task.kind === 'metric'
      ? { ...task, current: confirmed.value, version: confirmed.version }
      : { ...task, done: confirmed.done, version: confirmed.version };
    const pending = state.operations.filter((o) => sameTask(o, scope) && !o.blocked);
    const latest = pending[pending.length - 1];
    if (!latest) return result;
    return result.kind === 'metric' ? { ...result, current: latest.value ?? result.current }
      : { ...result, done: latest.done ?? result.done };
  }) };
}
