import { createChallenge, createChannel, createMeetup, createSport, createTrip, applyToMeetup } from '../api';

const response = (data: unknown, status = 201) => ({ ok: status < 300, status, json: async () => data }) as Response;
afterEach(() => jest.restoreAllMocks());

it.each([
  [createChallenge, 'challenge'], [createChannel, 'channel'], [createMeetup, 'meetup'],
  [createSport, 'sport'], [createTrip, 'trip'],
] as const)('preserves a confirmed creation ID for %s', async (create, key) => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ id: 'root-id' }))
    .mockResolvedValueOnce(response({ [key]: { id: 'nested-id' } }));
  expect(await create('token', {})).toMatchObject({ ok: true, createdId: 'root-id' });
  expect(await create('token', {})).toMatchObject({ ok: true, createdId: 'nested-id' });
});

it.each([{}, { id: null }, { id: '' }, { id: ' ' }, { id: 1 }, { id: {} }])('does not invent IDs for %j', async body => {
  jest.spyOn(global, 'fetch').mockResolvedValue(response(body));
  expect(await createMeetup('token', {})).not.toHaveProperty('createdId');
});

it('never exposes a failure or application ID as a newly created publication', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ id: 'denied-id' }, 403))
    .mockResolvedValueOnce(response({ id: 'application-id' }));
  expect(await createMeetup('token', {})).not.toHaveProperty('createdId');
  expect(await applyToMeetup('token', 'existing-event')).not.toHaveProperty('createdId');
});
