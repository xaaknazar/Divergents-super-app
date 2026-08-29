import { markLessonComplete } from '../api';

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('does not report completion when the server rejects the request', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401 } as Response);

  await expect(markLessonComplete('course/1', 'lesson-1', 'token')).resolves.toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toContain('course%2F1/progress');
});

it('retries a transient server failure once', async () => {
  jest.useFakeTimers();
  const fetchMock = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
    .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

  const result = markLessonComplete('course-1', 'lesson-1', 'token');
  await jest.advanceTimersByTimeAsync(500);

  await expect(result).resolves.toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
