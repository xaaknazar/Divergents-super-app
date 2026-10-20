import { fetchActiveChallenges } from '../community';

const snapshot = (id: string, day: number, value: number) => ({
  challenge: { id, title: id, currentDay: day, totalDays: 15, tasks: [{ id: 'pages', kind: 'metric', title: 'Чтение', current: value, min: 20, version: 3 }] },
  members: [{ id: 'me', name: 'Участник', isMe: true, weekBase: 0, day: value, todayTasks: [] }],
});
const response = (body: unknown, status = 200) => ({ ok: status === 200, status, json: async () => body }) as Response;
afterEach(() => jest.restoreAllMocks());
test('loads every membership with its own values, versions and day', async () => {
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(response({ activeChallenges: [snapshot('first', 7, 20), snapshot('second', 2, 40)] }));
  const result = await fetchActiveChallenges('token');
  expect(result.ok).toBe(true);
  expect(result.challenges.map(v => [v.challenge?.id, v.challenge?.currentDay, v.challenge?.tasks[0].version])).toEqual([['first', 7, 3], ['second', 2, 3]]);
  expect(fetch.mock.calls[0][0]).toContain('/active?all=1');
  expect(fetch.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer token' });
});
test.each([
  { challenge: snapshot('first', 1, 20).challenge, members: [] },
  { activeChallenges: [snapshot('first', 1, 20), { challenge: null }] },
  { activeChallenges: [{ ...snapshot('first', 1, 20), members: [] }] },
  { activeChallenges: [snapshot('first', 1, 20), snapshot('first', 2, 40)] },
])('invalid/legacy or partial payloads never erase known memberships: %j', async body => {
  jest.spyOn(global, 'fetch').mockResolvedValue(response(body));
  expect(await fetchActiveChallenges('token')).toEqual({ ok: false, challenges: [] });
});
test('an authoritative empty array is valid, while auth failure is not', async () => {
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ activeChallenges: [] })).mockResolvedValueOnce(response(null, 401));
  expect(await fetchActiveChallenges('token')).toEqual({ ok: true, challenges: [] });
  expect(await fetchActiveChallenges('token')).toEqual({ ok: false, challenges: [] });
  expect(await fetchActiveChallenges()).toEqual({ ok: false, challenges: [] });
  expect(fetch).toHaveBeenCalledTimes(2);
});
