import { netFetch, isNetworkError } from '../net';

const okResponse = () => ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response;
const networkFail = () => { throw new TypeError('Network request failed'); };

describe('isNetworkError', () => {
  it('узнаёт обрыв связи и отмену по таймауту', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError(Object.assign(new Error('Aborted'), { name: 'AbortError' }))).toBe(true);
  });

  it('ответ сервера ошибкой сети не считает', () => {
    expect(isNetworkError(new Error('HTTP 500'))).toBe(false);
    expect(isNetworkError('строка')).toBe(false);
  });
});

describe('netFetch', () => {
  const original = global.fetch;
  afterEach(() => { global.fetch = original; jest.useRealTimers(); });

  it('повторяет чтение после обрыва — первый запрос из фона часто падает', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      if (calls === 1) networkFail();
      return okResponse();
    }) as any;

    const res = await netFetch('https://example.test/data');
    expect(res.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('сдаётся после последней попытки и бросает исходную ошибку', async () => {
    global.fetch = jest.fn(async () => networkFail()) as any;
    await expect(netFetch('https://example.test/data')).rejects.toThrow('Network request failed');
    expect(global.fetch).toHaveBeenCalledTimes(2); // одна попытка + один повтор
  });

  it('POST по умолчанию не повторяется — это могло бы создать вторую запись', async () => {
    global.fetch = jest.fn(async () => networkFail()) as any;
    await expect(netFetch('https://example.test/apply', { method: 'POST' })).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('ответ сервера возвращается как есть, без повторов', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 }) as unknown as Response) as any;
    const res = await netFetch('https://example.test/data');
    expect(res.status).toBe(500);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
