import { ProgressOutbox, mergeProgressOutbox, type ProgressOperation, type ProgressOutboxState } from '../progressOutbox';
import type { Challenge, ProgressResult } from '../../data/community';

const input = { challengeId: 'c', day: 1, taskId: 'pages', expectedVersion: 0, value: 20 };
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const ack = (o: ProgressOperation) => ({ ok: true, status: 200, version: o.expectedVersion + 1, savedValue: o.value ?? 0, savedDone: o.done ?? false });
function harness(restored: ProgressOutboxState | null = null) {
  let disk: ProgressOutboxState | null = restored;
  let n = 0;
  const io = { uuid: () => `operation-${++n}`, changed: jest.fn(),
    save: jest.fn(async (s: ProgressOutboxState) => { disk = structuredClone(s); }),
    send: jest.fn(async (o: ProgressOperation): Promise<ProgressResult> => ack(o)) };
  return { io, box: new ProgressOutbox('owner', restored, io), disk: () => disk };
}

test('durably persists before sending; storage failure never reaches server', async () => {
  const h = harness();
  h.io.save.mockRejectedValue(new Error('disk full'));
  h.box.enqueue(input); await tick();
  expect(h.io.send).not.toHaveBeenCalled();
  expect(h.io.changed).toHaveBeenLastCalledWith(expect.anything(), 'storage');
});

test('multiple edits remain immutable and use dependent versions', async () => {
  const h = harness();
  let finish!: (value: any) => void;
  h.io.send.mockImplementationOnce(() => new Promise((r) => { finish = r; }));
  h.box.enqueue(input); await tick();
  const first = h.io.send.mock.calls[0][0];
  h.box.enqueue({ ...input, value: 25 }); await tick();
  expect(h.disk()?.operations).toHaveLength(2);
  finish(ack(first)); await tick();
  expect(h.io.send.mock.calls[1][0]).toMatchObject({ value: 25, expectedVersion: 1 });
  expect(h.box.state.operations).toHaveLength(0);
  expect(h.box.state.confirmed[0]).toMatchObject({ value: 25, version: 2 });
});

test('restart resends exact operation after lost acknowledgement', async () => {
  const h = harness();
  h.io.send.mockResolvedValue({ ok: false, status: 0 } as any);
  h.box.enqueue(input); await tick(); h.box.dispose();
  const next = harness(h.disk());
  await next.box.flush();
  expect(next.io.send.mock.calls[0][0]).toEqual(h.io.send.mock.calls[0][0]);
  expect(next.box.state.operations).toHaveLength(0);
});

test('conflict blocks stale value and following edits instead of silently rebasing', async () => {
  const h = harness();
  h.io.send.mockResolvedValue({ ok: false, status: 409, reason: 'version_conflict',
    current: { challengeId: 'c', day: 1, taskId: 'pages', version: 8, value: 40, done: false } } as any);
  h.box.enqueue(input); h.box.enqueue({ ...input, value: 0 }); await tick();
  expect(h.io.send).toHaveBeenCalledTimes(1);
  expect(h.box.state.operations.every((o) => o.blocked === 'version_conflict')).toBe(true);
  expect(h.box.state.confirmed[0].value).toBe(40);
});

test('rapid taps coalesce only before any attempt; restart preserves uncertain commands', async () => {
  const h = harness();
  for (let value = 1; value <= 100; value++) h.box.enqueue({ ...input, value });
  await tick();
  expect(h.io.send).toHaveBeenCalledTimes(1);
  expect(h.io.send.mock.calls[0][0]).toMatchObject({ value: 100, expectedVersion: 0 });
});

test('restored dependent edits are replayed in version order', async () => {
  const h = harness({ ownerId: 'owner', confirmed: [], operations: [
    { ...input, operationId: 'second', expectedVersion: 1, value: 25 },
    { ...input, operationId: 'first', expectedVersion: 0, value: 20 },
  ] });
  await h.box.flush();
  expect(h.io.send.mock.calls.map(([o]) => o.operationId)).toEqual(['first', 'second']);
});

test('old GET cannot replace confirmed value; newer server version wins', () => {
  const c = { id: 'c', currentDay: 1, tasks: [{ id: 'pages', kind: 'metric', current: 0, version: 1 }] } as Challenge;
  const state = { ownerId: 'owner', operations: [], confirmed: [
    { challengeId: 'c', day: 1, taskId: 'pages', version: 2, value: 20, done: false },
  ] };
  expect(mergeProgressOutbox(c, state).tasks[0]).toMatchObject({ current: 20, version: 2 });
  expect(mergeProgressOutbox({ ...c, tasks: [{ ...c.tasks[0], version: 3 }] }, state).tasks[0]).toMatchObject({ current: 0, version: 3 });
  expect(mergeProgressOutbox({ ...c, currentDay: 2 }, state).tasks[0]).toMatchObject({ current: 0 });
});

test('switching accounts never restores or sends the previous owner queue', async () => {
  const h = harness({ ownerId: 'other', operations: [{ ...input, operationId: 'old' }], confirmed: [] });
  await h.box.flush(); expect(h.io.send).not.toHaveBeenCalled();
});

test('disposed account ignores a late receipt', async () => {
  const h = harness();
  let finish!: (value: any) => void;
  h.io.send.mockImplementationOnce(() => new Promise((r) => { finish = r; }));
  h.box.enqueue(input); await tick(); h.box.dispose();
  const calls = h.io.changed.mock.calls.length;
  finish(ack(h.io.send.mock.calls[0][0])); await tick();
  expect(h.io.changed).toHaveBeenCalledTimes(calls);
});

test('an incompatible receipt must not starve independent tasks or clear the error after their success', async () => {
  const h = harness();
  h.io.send.mockImplementation(async o => o.taskId === 'pages'
    ? { ok: false, status: 200, reason: 'protocol_mismatch' } : ack(o));
  h.box.enqueue(input);
  h.box.enqueue({ ...input, taskId: 'steps', value: 10000 });
  await tick();
  expect(h.io.send.mock.calls.map(([o]) => o.taskId)).toEqual(['pages', 'steps']);
  expect(h.box.state.operations).toHaveLength(1);
  expect(h.io.changed).toHaveBeenLastCalledWith(expect.anything(), 'protocol_mismatch');
});

test('backoff preserves ordering within a task without blocking another task', async () => {
  const h = harness();
  h.io.send.mockResolvedValueOnce({ ok: false, status: 503, reason: 'server' });
  h.box.enqueue(input); await tick();
  h.box.enqueue({ ...input, value: 30 });
  h.box.enqueue({ ...input, taskId: 'steps', value: 10000 });
  await tick();
  expect(h.io.send.mock.calls.map(([o]) => o.taskId)).toEqual(['pages', 'steps']);
  expect(h.box.state.operations.map(o => o.value)).toEqual([20, 30]);
});

test('transport exceptions are not incorrectly reported as storage failures', async () => {
  const h = harness();
  h.io.send.mockRejectedValueOnce(new Error('token refresh failed'));
  h.box.enqueue(input); await tick();
  expect(h.io.changed).toHaveBeenLastCalledWith(expect.anything(), 'network');
  expect(h.disk()?.operations).toHaveLength(1);
});

test('failed operation retries verbatim after backoff, then releases its dependent edit', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  try {
    const h = harness();
    h.io.send.mockResolvedValueOnce({ ok: false, status: 0, reason: 'network' });
    h.box.enqueue(input); await tick();
    const first = structuredClone(h.io.send.mock.calls[0][0]);
    h.box.enqueue({ ...input, value: 25 }); await tick();
    expect(h.io.send).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(21000);
    await h.box.flush();
    expect(h.io.send.mock.calls[1][0]).toEqual(first);
    expect(h.io.send.mock.calls[2][0]).toMatchObject({ expectedVersion: 1, value: 25 });
    expect(h.disk()?.operations).toHaveLength(0);
    expect(h.io.changed).toHaveBeenLastCalledWith(expect.anything(), undefined);
  } finally { clock.mockRestore(); random.mockRestore(); }
});

test('a total outage tries each independent task at most once per flush, retaining all commands', async () => {
  const h = harness();
  h.io.send.mockResolvedValue({ ok: false, status: 503, reason: 'server' });
  for (const taskId of ['pages', 'steps', 'sugar']) h.box.enqueue({ ...input, taskId });
  await tick(); await h.box.flush();
  expect(h.io.send.mock.calls.map(([o]) => o.taskId)).toEqual(['pages', 'steps', 'sugar']);
  expect(h.disk()?.operations).toHaveLength(3);
  expect(h.box.state.confirmed).toHaveLength(0);
});
