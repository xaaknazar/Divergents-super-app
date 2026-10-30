import { fetchMyCourses } from '../api';
const response = (body: unknown, status = 200) => ({ ok: status === 200, status, json: async () => body }) as Response;
afterEach(() => jest.restoreAllMocks());
test.each([null, {}, { courses: null }, { courses: [{}] }, { courses: [{ id: '' }] }])(
  'malformed ownership never becomes successful loss of access: %j', async body => {
    jest.spyOn(global, 'fetch').mockResolvedValue(response(body));
    await expect(fetchMyCourses('fixture')).rejects.toThrow();
  });
test('valid empty ownership is distinct from an authentication/server failure', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ courses: [] }))
    .mockResolvedValueOnce(response(null, 401)).mockResolvedValueOnce(response(null, 500));
  await expect(fetchMyCourses('fixture')).resolves.toEqual([]);
  await expect(fetchMyCourses('fixture')).rejects.toThrow('HTTP 401');
  await expect(fetchMyCourses('fixture')).rejects.toThrow('HTTP 500');
});
