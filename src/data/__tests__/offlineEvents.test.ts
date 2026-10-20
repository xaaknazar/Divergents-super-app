import { fetchEventApplicants, fetchMeetupDetail, fetchSportDetail, fetchTripDetail } from '../community';
import { fetchJson } from '../contracts/http';
import { validateOfflineEvent, eventStartMs } from '../offlineEventPolicy';

jest.mock('../contracts/http', () => ({ ...jest.requireActual('../contracts/http'), fetchJson: jest.fn() }));

const event = { id: 'event-1', title: 'Встреча', city: 'Алматы', description: 'Знакомимся за кофе', place: 'Кофейня', meetPlace: 'Вход в парк', meetAt: '2099-01-01 19:00', meetLat: 43.2, meetLng: 76.9, spots: 10, days: 1 };

afterEach(() => jest.restoreAllMocks());

it.each(['trip', 'sport', 'meetup'] as const)('%s requires city, capacity, future time, description and map point', kind => {
  expect(validateOfflineEvent(kind, event)).toBeNull();
  for (const patch of [{ city: '' }, { description: '' }, { spots: 0 }, { spots: 1.1 }, { meetLat: undefined }, { meetLng: 181 }, { meetAt: '2000-01-01 19:00' }, { meetAt: '2099-02-30 19:00' }]) {
    expect(validateOfflineEvent(kind, { ...event, ...patch })).not.toBeNull();
  }
  expect(eventStartMs('2026-09-23 19:00')).toBe(Date.parse('2026-09-23T14:00:00Z'));
});

it.each([false, undefined])('drops private applicant fields unless the server explicitly allows them (%s)', async canViewProfiles => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({
    canViewProfiles, applications: [{ id: 'a', userId: 'u', userName: 'Псевдоним', status: 'pending', createdAt: 'now', fullName: 'PRIVATE NAME', userEmail: 'private@test', profile: { secret: true } }],
  }) } as Response);
  const result = await fetchEventApplicants('meetup', 'event-1', 'token');
  expect(result?.canViewProfiles).toBe(false);
  expect(result?.applications[0]).not.toHaveProperty('profile');
  expect(result?.applications[0]).not.toHaveProperty('userEmail');
  expect(result?.applications[0]).not.toHaveProperty('fullName');
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/meetups/event-1/applications'), expect.anything());
});

it('keeps private fields only for admin-authorized responses', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({
    canViewProfiles: true, applications: [{ id: 'a', userId: 'u', userName: 'Псевдоним', status: 'pending', fullName: 'Имя Фамилия', profile: { completeness: 80 } }],
  }) } as Response);
  expect((await fetchEventApplicants('trip', 'event-1', 'token'))?.applications[0].fullName).toBe('Имя Фамилия');
});

it.each([
  ['trip', fetchTripDetail], ['meetup', fetchMeetupDetail], ['sport', fetchSportDetail],
] as const)('%s detail preserves authoritative application status and closed flag', async (kind, fetchDetail) => {
  jest.mocked(fetchJson).mockResolvedValue({ data: { [kind]: event, myStatus: 'rejected', closed: true, canManage: false, pendingCount: 0 }, error: false } as any);
  const result = await fetchDetail('event-1', 'token');
  expect(result).toMatchObject({ myStatus: 'rejected', closed: true });
  const mapped = kind === 'trip' ? (result as any).trip : (result as any).meetup;
  expect(mapped.city).toBe('Алматы');
  expect(mapped.price).toBe('Бесплатно');
});
