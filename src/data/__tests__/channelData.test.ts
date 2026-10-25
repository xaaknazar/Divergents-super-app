import { fetchChannelData } from '../channel';

jest.mock('../api', () => ({ API_BASE: 'https://example.test' }));
const calls: { url: string; init: any }[] = [];
jest.mock('../net', () => ({ netFetch: jest.fn(async (url: string, init: any) => {
  calls.push({ url, init });
  return { ok: true, json: async () => ({ channels: [
    { id: 'c1', name: 'Открытый', access: 'open', createdAt: '2026-10-01T00:00:00Z', posts: [
      { id: 'p1', type: 'article', title: 'Новое', createdAt: '2026-10-25T08:00:00Z', reactions: { '👍': 2 } }], _count: { posts: 1, members: 1284 } },
    { id: 'c2', name: 'Закрытый', access: 'paid', createdAt: '2026-10-01T00:00:00Z', posts: [], _count: { posts: 12, members: 86 } },
  ] }) };
}) }));

beforeEach(() => { calls.length = 0; });

test('the channel list is requested with the account: closed channels send posts only to their members', async () => {
  await fetchChannelData('token-1');
  expect(calls[0].init.headers.Authorization).toBe('Bearer token-1');
  await fetchChannelData(null);
  expect(calls[1].init.headers.Authorization).toBeUndefined();
});

test('counts come from the server even when a closed channel\'s posts are hidden', async () => {
  const { channels, posts } = await fetchChannelData('t');
  expect(channels.map(c => [c.id, c.access, c.memberCount, c.postCount])).toEqual([['c1', 'open', 1284, 1], ['c2', 'request', 86, 12]]);
  expect(posts[0]).toMatchObject({ id: 'p1', channelId: 'c1', createdAt: '2026-10-25T08:00:00Z', likes: 2 });
});
