import { ReadingOutbox, ReadingQueue } from '../readingOutbox';
import { ReadingApiError } from '../../data/reading';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));

const stop = { action: 'stop', operationId: 'stop-1', challengeId: 'c1', sessionId: 's1', elapsedMs: 600000 };
const report = { action: 'report', operationId: 'report-1', challengeId: 'c1', sessionId: 's1', pages: 22 };
function harness(initial: ReadingQueue | null = null) {
  let disk = initial;
  const io = { read: jest.fn(async () => disk),
    write: jest.fn(async (q: ReadingQueue) => { disk = JSON.parse(JSON.stringify(q)); }),
    send: jest.fn(async (_command: typeof report | typeof stop | { action: string; operationId: string }) => ({ ok: true as const })), isCurrentAccount: jest.fn(() => true) };
  return { io, box: new ReadingOutbox('reader', io), disk: () => disk };
}
test('persists stop and pages offline, then retries the exact operations after restart', async () => {
  const h = harness();
  await h.box.enqueue(stop); await h.box.enqueue(report);
  h.io.send.mockRejectedValueOnce(new Error('offline'));
  await expect(h.box.flush()).rejects.toThrow('offline');
  expect(h.disk()?.commands).toEqual([stop, report]);
  const restarted = harness(h.disk()); await restarted.box.flush();
  expect(restarted.io.send.mock.calls.map(c => c[0])).toEqual([stop, report]);
  expect(restarted.disk()?.commands).toEqual([]);
});
test('storage failure never sends an unsaved command', async () => {
  const h = harness(); h.io.write.mockRejectedValueOnce(new Error('disk full'));
  await expect(h.box.enqueue(report)).rejects.toThrow('disk full');
  await h.box.flush(); expect(h.io.send).not.toHaveBeenCalled();
});
test('lost local acknowledgement resends same id instead of duplicating time/pages', async () => {
  const h = harness(); await h.box.enqueue(report);
  h.io.write.mockRejectedValueOnce(new Error('disk full'));
  await expect(h.box.flush()).rejects.toThrow('disk full');
  await h.box.flush(); expect(h.io.send.mock.calls).toEqual([[report], [report]]);
});
test('two challenge screens cannot overwrite the shared outbox', async () => {
  const h = harness(), second = new ReadingOutbox('reader', h.io);
  await Promise.all([h.box.enqueue(stop), second.enqueue(report)]);
  expect(h.disk()?.commands).toEqual([stop, report]);
});
test('same operation is immutable and duplicate taps are harmless', async () => {
  const h = harness(); await h.box.enqueue(report); await h.box.enqueue(report);
  await expect(h.box.enqueue({ ...report, pages: 202 })).rejects.toThrow('Конфликт');
  expect(h.disk()?.commands).toEqual([report]);
});
test('another account cannot send or erase the previous account evidence', async () => {
  const h = harness({ accountId: 'other', commands: [report] });
  await expect(h.box.flush()).resolves.toEqual([]);
  expect(h.io.send).not.toHaveBeenCalled(); expect(h.io.write).not.toHaveBeenCalled();
});
test('another account can apply while preserving signed-out account reports, then the owner retries', async () => {
  const h = harness({ accountId: 'other', commands: [stop, report] });
  const apply = { action: 'apply', operationId: 'apply-2', challengeId: 'c2', teamId: 't2' };
  await h.box.enqueue(apply); await h.box.flush();
  expect(h.io.send.mock.calls).toEqual([[apply]]);
  expect(h.disk()).toEqual({ accountId: 'reader', commands: [], otherAccounts: [{ accountId: 'other', commands: [stop, report] }] });
  const owner = new ReadingOutbox('other', h.io);
  await owner.flush();
  expect(h.io.send.mock.calls).toEqual([[apply], [stop], [report]]);
  expect(h.disk()).toEqual({ accountId: 'other', commands: [] });
});
test('three accounts retain their commands across cold loads and only the authenticated account flushes', async () => {
  const h = harness({ accountId: 'other', commands: [report] });
  await h.box.enqueue(stop);
  const third = new ReadingOutbox('third', h.io);
  const thirdReport = { ...report, operationId: 'report-third' };
  await third.enqueue(thirdReport);
  const restarted = harness(h.disk());
  await restarted.box.flush();
  expect(restarted.io.send.mock.calls).toEqual([[stop]]);
  expect(restarted.disk()?.otherAccounts).toEqual([
    { accountId: 'third', commands: [thirdReport] }, { accountId: 'other', commands: [report] },
  ]);
});
test('switch during disk read cannot migrate or overwrite another account queue', async () => {
  const h = harness({ accountId: 'other', commands: [report] });
  h.io.read.mockImplementationOnce(async () => { h.io.isCurrentAccount.mockReturnValue(false); return h.disk(); });
  await expect(h.box.enqueue(stop)).rejects.toThrow('Аккаунт изменился');
  expect(h.io.write).not.toHaveBeenCalled(); expect(h.io.send).not.toHaveBeenCalled();
});
test('late response after account switch is not acknowledged locally', async () => {
  const h = harness(); await h.box.enqueue(report);
  h.io.send.mockImplementationOnce(async () => { h.io.isCurrentAccount.mockReturnValue(false); return { ok: true }; });
  await expect(h.box.flush()).rejects.toThrow('Аккаунт изменился');
  expect(h.disk()?.commands).toEqual([report]);
});
test('a definitive refusal never blocks later approaches; transport errors and resolvable conflicts keep everything', async () => {
  const later = { action: 'report', operationId: 'report-2', challengeId: 'c1', sessionId: 's2', pages: 3 };
  const reasons: string[] = [];
  const h = harness();
  const box = new ReadingOutbox('reader', { ...h.io, onRejectedStart: (c, dropped) => { reasons.push(`start:${c.sessionId}:${dropped.length}`); },
    onRejectedClose: (c, dropped) => { reasons.push(`${c.action}:${c.sessionId}:${dropped.map(d => d.action).join(',')}`); } });
  // Refused start: its time and pages are dropped with it, the next approach is still delivered.
  await box.enqueueMany([{ ...stop, action: 'start', operationId: 'start-1' }, stop, report, later]);
  h.io.send.mockImplementation(async (c: { action: string }) => { if (c.action === 'start') throw new ReadingApiError('Подход начат больше 7 дней назад', 409, 'offline_too_old'); return { ok: true }; });
  await expect(box.flush()).resolves.toEqual([expect.objectContaining({ command: later })]);
  expect(h.disk()?.commands).toEqual([]); expect(reasons).toEqual(['start:s1:2']);
  // Another device holds an open approach: resolvable, everything stays queued.
  await box.enqueueMany([{ ...stop, action: 'start', operationId: 'start-2' }, stop]);
  h.io.send.mockRejectedValue(new ReadingApiError('Сначала завершите предыдущий сеанс', 409, 'session_pending'));
  await expect(box.flush()).rejects.toThrow(); expect(h.disk()?.commands.map(c => c.operationId)).toEqual(['start-2', 'stop-1']);
  // Transport failure or 5xx: kept for an exact retry.
  h.io.send.mockRejectedValue(new ReadingApiError('Сервер', 503));
  await expect(box.flush()).rejects.toThrow(); expect(h.disk()?.commands).toHaveLength(2);
  h.io.write.mockClear(); await h.io.write({ accountId: 'reader', commands: [] });
  // Already stopped: the stop is acknowledged and the pages still go.
  await box.enqueueMany([stop, report]);
  h.io.send.mockImplementation(async (c: { action: string }) => { if (c.action === 'stop') throw new ReadingApiError('Сеанс уже остановлен', 409, 'state'); return { ok: true }; });
  await box.flush(); expect(h.io.send.mock.calls.slice(-2).map(c => c[0].action)).toEqual(['stop', 'report']); expect(h.disk()?.commands).toEqual([]);
  // Refused stop (wrong device): stop and its pages are dropped and reported; the next approach goes.
  await h.io.write({ accountId: 'reader', commands: [] });
  await box.enqueueMany([{ ...stop, operationId: 'stop-x' }, { ...report, operationId: 'report-x' }, later]);
  h.io.send.mockReset().mockImplementation(async (c: { action: string; sessionId?: string }) => {
    if (c.sessionId === 's1') throw new ReadingApiError('Остановите сеанс на устройстве, где начали чтение', 403, 'device'); return { ok: true }; });
  await box.flush(); expect(h.disk()?.commands).toEqual([]);
  expect(reasons.slice(-1)).toEqual(['stop:s1:report']);
  expect(h.io.send.mock.calls.map(c => c[0].operationId)).toEqual(['stop-x', 'report-2']);
});

describe('network outside the journal lock', () => {
  function slowHarness() {
    const h = harness();
    let release!: () => void;
    h.io.send.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve({ ok: true as const }); }));
    return { ...h, release: () => release() };
  }
  test('a slow upload never delays saving another account evidence', async () => {
    const h = slowHarness(), other = new ReadingOutbox('other', h.io);
    await h.box.enqueue(stop);
    const flushing = h.box.flush();
    await new Promise(r => setTimeout(r, 0));
    expect(h.io.send).toHaveBeenCalledTimes(1);
    await other.enqueue(report);
    const saved = h.disk(), parts = saved ? [saved, ...(saved.otherAccounts ?? [])] : [];
    expect(parts.find(part => part.accountId === 'other')?.commands).toEqual([report]);
    expect(parts.find(part => part.accountId === 'reader')?.commands).toEqual([stop]);
    h.release(); await flushing;
    expect(h.disk()).toEqual({ accountId: 'reader', commands: [], otherAccounts: [{ accountId: 'other', commands: [report] }] });
  });
  test('a command saved during an in-flight send is kept and sent after it, in order', async () => {
    const h = slowHarness();
    await h.box.enqueue(stop);
    const flushing = h.box.flush();
    await new Promise(r => setTimeout(r, 0));
    await h.box.enqueue(report);
    expect(h.disk()?.commands).toEqual([stop, report]);
    h.release(); await flushing;
    expect(h.io.send.mock.calls.map(c => c[0])).toEqual([stop, report]);
    expect(h.disk()?.commands).toEqual([]);
  });
  test('parallel flushes from two screens send each command exactly once', async () => {
    const h = slowHarness(), second = new ReadingOutbox('reader', h.io);
    await h.box.enqueue(stop); await h.box.enqueue(report);
    const a = h.box.flush(), b = second.flush();
    await new Promise(r => setTimeout(r, 0));
    h.release(); await Promise.all([a, b]);
    expect(h.io.send.mock.calls.map(c => c[0])).toEqual([stop, report]);
  });
  test('a failed send keeps the command and the following one for an exact retry', async () => {
    const h = harness();
    await h.box.enqueue(stop); await h.box.enqueue(report);
    h.io.send.mockRejectedValueOnce(new Error('offline'));
    await expect(h.box.flush()).rejects.toThrow('offline');
    expect(h.disk()?.commands).toEqual([stop, report]);
  });
test('a stalled upload never blocks durable pages and its receipt preserves concurrently appended commands', async () => {
  const h = harness(); await h.box.enqueue(stop);
  let release!: () => void, started!: () => void;
  const sending = new Promise<void>(resolve => { started = resolve; });
  h.io.send.mockImplementationOnce(async () => { started(); await new Promise<void>(resolve => { release = resolve; }); return { ok: true }; });
  const flushing = h.box.flush(); await sending;
  let persisted = false;
  const saving = h.box.enqueue(report).then(() => { persisted = true; });
  // Drain local microtasks only: the server deliberately has not answered.
  for (let i = 0; i < 30; i++) await Promise.resolve();
  const savedBeforeResponse = persisted, durableBeforeResponse = h.disk()?.commands;
  release(); await Promise.all([saving, flushing]);
  // Also drain if the old implementation did not see the append until after its flush.
  await h.box.flush();
  expect(savedBeforeResponse).toBe(true);
  expect(durableBeforeResponse).toEqual([stop, report]);
  expect(h.io.send.mock.calls.map(call => call[0])).toEqual([stop, report]);
  expect(h.disk()?.commands).toEqual([]);
});

test('parallel flushes of the same account send each operation once in order', async () => {
  const h = harness(); await h.box.enqueue(stop); await h.box.enqueue(report);
  await Promise.all([h.box.flush(), new ReadingOutbox('reader', h.io).flush()]);
  expect(h.io.send.mock.calls.map(call => call[0])).toEqual([stop, report]);
});

test('stop and report batch is all-or-nothing on storage failure or a conflicting immutable report', async () => {
  const h = harness();
  h.io.write.mockRejectedValueOnce(new Error('disk full'));
  await expect(h.box.enqueueMany([stop, report])).rejects.toThrow('disk full');
  expect(h.disk()).toBeNull();
  await h.box.enqueue(report);
  await expect(h.box.enqueueMany([stop, { ...report, pages: 202 }])).rejects.toThrow('Конфликт');
  expect(h.disk()?.commands).toEqual([report]);
});

test('switching accounts during an upload preserves new-account pages and old-account evidence', async () => {
  const h = harness(); await h.box.enqueue(stop);
  let release!: () => void, started!: () => void;
  const sending = new Promise<void>(resolve => { started = resolve; });
  h.io.send.mockImplementationOnce(async () => { started(); await new Promise<void>(resolve => { release = resolve; }); return { ok: true }; });
  const previousUpload = h.box.flush();
  const failed = expect(previousUpload).rejects.toThrow('Аккаунт изменился');
  await sending;
  h.io.isCurrentAccount.mockReturnValue(false);
  const secondSend = jest.fn(async () => ({ ok: true as const }));
  const second = new ReadingOutbox('second-reader', { ...h.io, isCurrentAccount: () => true, send: secondSend });
  await second.enqueue(report); await second.flush();
  expect(secondSend.mock.calls).toHaveLength(1);
  expect(h.disk()?.otherAccounts).toEqual([{ accountId: 'reader', commands: [stop] }]);
  release(); await failed;
  expect(h.disk()?.otherAccounts).toEqual([{ accountId: 'reader', commands: [stop] }]);
});
});
