import { submitResume } from '../talentslab';
import { syncResumeSnapshot } from '../api';
import { NicknameTakenError } from '../nickname';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

it('preserves nickname_taken from both services instead of treating it as offline', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ reason: 'nickname_taken' }) });
  await expect(syncResumeSnapshot('session', { resume: { nickname: 'Beknazar' } })).rejects.toBeInstanceOf(NicknameTakenError);
  await expect(submitResume('session', { nickname: 'Beknazar' })).rejects.toBeInstanceOf(NicknameTakenError);
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: 'nickname_taken' }) });
  await expect(submitResume('session', { nickname: 'Beknazar' })).rejects.toBeInstanceOf(NicknameTakenError);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: false, error: 'nickname_taken' }) });
  await expect(submitResume('session', { nickname: 'Beknazar' })).rejects.toBeInstanceOf(NicknameTakenError);
});

it('upserts the first questionnaire through the authenticated Talentslab API', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, id: 1 }) });
  expect(await submitResume('session', { first_name: 'Анна', last_name: 'Тест' })).toBe(true);
  const [url, init] = jest.mocked(global.fetch).mock.calls[0];
  expect(url).toMatch(/\/api\/mobile\/resume$/);
  expect(init?.headers).toMatchObject({ Authorization: 'Bearer session' });
  expect(JSON.parse(String(init?.body))).toEqual({ answers: { first_name: 'Анна', last_name: 'Тест', full_name: 'Тест Анна' } });
});

it('does not call an HTTP 200 application error a successful sync', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) });
  expect(await submitResume('session', { nickname: 'Anna' })).toBe(false);
});

it('does not mark a login/proxy HTML page as a saved questionnaire', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('invalid json'); } });
  expect(await submitResume('session', { nickname: 'Anna' })).toBe(false);
});

it('never falls back to submitting someone’s email without authentication', async () => {
  global.fetch = jest.fn();
  expect(await submitResume(null, { nickname: 'Anna' }, 'owner@example.test')).toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
});
