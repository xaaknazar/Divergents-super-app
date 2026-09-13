// Сетевой слой: таймаут + повтор при обрыве.
//
// Симптом, из-за которого это появилось: телефон в Wi-Fi, другие приложения
// работают, а наше показывает «ошибка сети». Причина не в интернете —
// соединения умирают, пока приложение в фоне, и ПЕРВЫЙ запрос после
// возвращения падает мгновенно с «Network request failed». Второй такой же
// запрос проходит. Раньше каждый модуль делал одиночный fetch с таймаутом и
// сразу показывал ошибку, поэтому пользователь видел сбой на ровном месте.
//
// Повторяем только то, что безопасно повторять: обрыв связи и таймаут. Ответ
// сервера (даже 500) не повторяем — он уже что-то значит, а повтор POST мог бы
// создать вторую запись.

export interface NetOptions extends RequestInit {
  timeoutMs?: number;
  /** Сколько раз повторить при обрыве. По умолчанию 1 для чтения, 0 для записи. */
  retries?: number;
}

/** Обрыв связи или таймаут — то, что имеет смысл повторить. */
export function isNetworkError(e: unknown): boolean {
  if (e instanceof Error) {
    // RN бросает TypeError('Network request failed'); отмена по таймауту —
    // AbortError. Разные движки называют их по-разному, поэтому смотрим текст.
    const m = `${e.name} ${e.message}`.toLowerCase();
    return m.includes('network request failed')
      || m.includes('abort')
      || m.includes('timeout')
      || m.includes('failed to fetch')
      || m.includes('connection');
  }
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch с таймаутом и повтором при обрыве.
 *
 * Задержки 600 мс и 1500 мс: этого хватает, чтобы система подняла соединение
 * после сна, и человек не успевает заметить паузу.
 */
export async function netFetch(url: string, options: NetOptions = {}): Promise<Response> {
  const { timeoutMs = 12000, retries, ...init } = options;
  const method = (init.method ?? 'GET').toUpperCase();
  const attempts = 1 + (retries ?? (method === 'GET' ? 1 : 0));
  const delays = [600, 1500];

  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    // Внешний signal (экран закрыли) должен отменять и наш запрос.
    const external = init.signal;
    if (external) {
      if (external.aborted) ctrl.abort();
      else external.addEventListener('abort', () => ctrl.abort(), { once: true });
    }
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } catch (e) {
      lastError = e;
      // Отмену снаружи не повторяем: экран уже закрыт.
      if (external?.aborted) throw e;
      if (i === attempts - 1 || !isNetworkError(e)) throw e;
      await sleep(delays[Math.min(i, delays.length - 1)]);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/** GET JSON с повтором. Бросает на сетевой ошибке и на не-200. */
export async function netJson(url: string, options: NetOptions = {}): Promise<any> {
  const res = await netFetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
