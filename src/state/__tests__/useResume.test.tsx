import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useResume } from '../useResume';
import { enqueueResume } from '../resumeSync';
import { normalizeProfile } from '../../data/talentslab';
import { NicknameTakenError } from '../../data/nickname';

const mockUser = { id: 'owner', primaryEmailAddress: { emailAddress: 'owner@example.test' }, update: jest.fn() };
let mockProfile: ReturnType<typeof normalizeProfile> | null = null;
const mockStore = new Map<string, unknown>();
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ getToken: async () => 'token' }), useUser: () => ({ user: mockUser }) }));
jest.mock('../useTalentProfile', () => ({ useTalentProfile: () => ({ profile: mockProfile, live: !!mockProfile?.found }) }));
jest.mock('../persist', () => ({
  loadJSON: jest.fn(async (key, fallback) => mockStore.has(key) ? mockStore.get(key) : fallback),
  saveJSON: jest.fn(async (key, value) => { mockStore.set(key, value); }),
}));
jest.mock('../resumeSync', () => ({ enqueueResume: jest.fn(), flushResume: jest.fn(async () => true), pendingResume: jest.fn(async () => null), RESUME_OUTBOX: 'outbox' }));
jest.mock('../profileBus', () => ({ emitProfileChanged: jest.fn(), onProfileChanged: () => () => {} }));

beforeEach(() => {
  mockProfile = null;
  mockStore.clear();
  jest.clearAllMocks();
  jest.mocked(enqueueResume).mockResolvedValue(true);
});

it('sends newly entered answers from the same event, before React rerenders', async () => {
  const { result } = await renderHook(useResume);
  await waitFor(() => expect(result.current.hydrated).toBe(true));
  await act(async () => {
    result.current.setField('nickname', 'Anna');
    result.current.setField('phone', '123');
    await result.current.submit();
  });
  expect(enqueueResume).toHaveBeenCalledWith('owner', expect.objectContaining({ nickname: 'Anna', phone: '123' }), expect.any(Function), expect.objectContaining({ phone: '123' }));
});

it('returns the nickname conflict to the form and keeps the draft dirty', async () => {
  jest.mocked(enqueueResume).mockRejectedValue(new NicknameTakenError());
  const { result } = await renderHook(useResume);
  await waitFor(() => expect(result.current.hydrated).toBe(true));
  await act(async () => {
    result.current.setField('nickname', 'Beknazar');
    expect(await result.current.submitResult()).toEqual({ ok: false, reason: 'nickname_taken' });
  });
  expect(result.current.dirty).toBe(true);
  expect(result.current.answers.nickname).toBe('Beknazar');
  expect(mockStore.get('dvg.resume')).toMatchObject({ nickname: 'Beknazar' });
});

it('replaces stale persisted values with website edits when there are no unsent changes', async () => {
  mockStore.set('dvg.resume', { phone: 'old', current_city: 'old' });
  mockProfile = normalizeProfile({ found: true, resume: { phone: 'website', current_city: 'Алматы' } });
  const { result } = await renderHook(useResume);
  await waitFor(() => expect(result.current.answers.phone).toBe('website'));
  expect(result.current.answers.current_city).toBe('Алматы');
});

it('does not replace a field being edited with a website refresh', async () => {
  mockProfile = normalizeProfile({ found: true, resume: { phone: 'website', current_city: 'old' } });
  const { result, rerender } = await renderHook(useResume);
  await waitFor(() => expect(result.current.answers.phone).toBe('website'));
  await act(async () => { result.current.setField('phone', 'draft'); });
  mockProfile = normalizeProfile({ found: true, resume: { phone: 'new web', current_city: 'Астана' } });
  await rerender({});
  await waitFor(() => expect(result.current.answers.current_city).toBe('Астана'));
  expect(result.current.answers.phone).toBe('draft');
});

it('sends only the edited field after a server profile has loaded', async () => {
  mockProfile = normalizeProfile({ found: true, resume: { phone: 'website', current_city: 'Алматы' } });
  const { result } = await renderHook(useResume);
  await waitFor(() => expect(result.current.answers.phone).toBe('website'));
  await act(async () => { result.current.setField('phone', 'new'); await result.current.submit(); });
  expect(jest.mocked(enqueueResume).mock.calls[0][1]).toMatchObject({ phone: 'new' });
  expect(jest.mocked(enqueueResume).mock.calls[0][1]).not.toHaveProperty('current_city');
});
