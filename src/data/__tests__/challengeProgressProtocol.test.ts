import { postChallengeProgress } from '../community';

const command = { taskId: 'pages', value: 20, day: 1, expectedVersion: 0, operationId: 'operation-123456789' };
const receipt = { ...command, challengeId: 'challenge', ok: true, version: 1, done: false, acceptedAt: '2026-10-08T12:00:00.000Z' };
const response = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body }) as Response;
afterEach(() => jest.restoreAllMocks());

test('production v1 HTTP 200 is a protocol mismatch, not an acknowledgement or network failure', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(response({ ok: true, day: 1, value: 20, clamped: false, superseded: false }));
  expect(await postChallengeProgress('challenge', command, 'token')).toEqual({ ok: false, status: 200, reason: 'protocol_mismatch' });
});

test('exact v2 receipt confirms the command', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(response(receipt));
  expect(await postChallengeProgress('challenge', command, 'token')).toMatchObject({ ok: true, version: 1, savedValue: 20 });
});

test.each([
  { operationId: 'someone-elses-operation' }, { day: 2 }, { value: 0 }, { version: 7 }, { acceptedAt: 'invalid' },
])('mismatched receipt stays unconfirmed: %j', async mismatch => {
  jest.spyOn(global, 'fetch').mockResolvedValue(response({ ...receipt, ...mismatch }));
  expect(await postChallengeProgress('challenge', command, 'token')).toEqual({ ok: false, status: 200, reason: 'invalid_receipt' });
});
