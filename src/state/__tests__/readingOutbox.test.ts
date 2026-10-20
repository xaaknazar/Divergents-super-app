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
test('rejected start can be retried, but a timing conflict never discards evidence', async () => {
  const h = harness(); await h.box.enqueue({ ...stop, action: 'start' });
  h.io.send.mockRejectedValue(new ReadingApiError('Сеанс уже есть', 409));
  await expect(h.box.flush()).rejects.toThrow(); expect(h.disk()?.commands).toEqual([]);
  await h.box.enqueue(stop);
  await expect(h.box.flush()).rejects.toThrow(); expect(h.disk()?.commands).toEqual([stop]);
});
