import { fetchChallengeApplicants } from '../community';
afterEach(() => jest.restoreAllMocks());
test.each([true, false, undefined, 'true'])('review capability is explicitly granted, not inferred from admin role: %s', async capability => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ applications: [], canManage: true, canReviewApplications: capability }) } as Response);
  expect((await fetchChallengeApplicants('c', 'token')).canReviewApplications).toBe(capability === true);
});
test('failed or unauthenticated loads never enable application decisions', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
  expect((await fetchChallengeApplicants('c', 'token')).canReviewApplications).toBe(false);
  expect((await fetchChallengeApplicants('c', null)).canReviewApplications).toBe(false);
});
