import { fetchApplicantActivity } from '../applicantActivity';
beforeEach(() => { global.fetch = jest.fn(); });
it('requires authentication and never falls back to fictitious history', async () => {
  await expect(fetchApplicantActivity('meetup', 'event', 'a', null, new AbortController().signal)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
it('rejects forbidden, old-server and mismatched applicant responses', async () => {
  for (const response of [{ ok: false, status: 403 }, { ok: false, status: 404 }, { ok: true, json: async () => ({ applicationId: 'someone-else', challenges: [], reading: [] }) }]) {
    jest.mocked(fetch).mockResolvedValueOnce(response as unknown as Response);
    await expect(fetchApplicantActivity('meetup', 'event', 'a', 'token', new AbortController().signal)).rejects.toThrow();
  }
});
it('empty confirmed history is valid and the request is scoped to the application', async () => {
  const payload = { applicationId: 'a', challenges: [], reading: [] };
  jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => payload } as Response);
  const signal = new AbortController().signal;
  await expect(fetchApplicantActivity('meetup', 'event', 'a', 'token', signal)).resolves.toEqual(payload);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('kind=meetup&eventId=event&applicationId=a'), { signal, headers: { Accept: 'application/json', Authorization: 'Bearer token' } });
});
