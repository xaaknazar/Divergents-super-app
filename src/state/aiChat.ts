// История переписки с ИИ — вне экрана, как загрузки (`downloads.ts`).
//
// Раньше история жила в состоянии экрана и сохранялась с задержкой в 700 мс,
// а таймер отменялся при размонтировании. Вкладки создаются лениво и
// отсоединяются, дерево пересоздаётся при появлении userId из Clerk — поэтому
// последние сообщения регулярно не доезжали до диска. Плюс неудачное чтение
// выглядело как «истории нет» и следующее сохранение затирало файл пустотой.
//
// Здесь состояние живёт в модуле: размонтирование экрана его не трогает,
// запись идёт сразу после изменения (saveJSON сериализует записи по ключу), а
// при неуспешном чтении сохранение запрещено, пока не прочитаем удачно.
import { useEffect, useState } from 'react';
import { readJSON, saveJSON } from './persist';

export type AiChatMsg = { id: string; role: 'user' | 'bot'; text: string; err?: boolean };
export type AiThreads = Record<string, AiChatMsg[]>;

const KEY = 'ai.history.v1';
/** Сколько сообщений храним в одной переписке. */
export const MAX_PERSIST = 40;

let threads: AiThreads = {};
let loaded = false;
let loading: Promise<void> | null = null;
/** Чтение упало — сохранять нельзя, иначе затрём то, что не смогли прочитать. */
let readFailed = false;

const subs = new Set<() => void>();
const notify = () => subs.forEach((fn) => fn());

function trim(all: AiThreads): AiThreads {
  const out: AiThreads = {};
  for (const k of Object.keys(all)) {
    const arr = all[k];
    if (!Array.isArray(arr)) continue;
    // Пустые «пузыри» — недописанный ответ из прошлой сессии; хранить нечего.
    const clean = arr.filter((m) => m && typeof m.text === 'string' && m.text.trim());
    if (clean.length) out[k] = clean.slice(-MAX_PERSIST);
  }
  return out;
}

export async function loadAiChat(): Promise<void> {
  if (loaded) return;
  if (loading) return loading;
  loading = (async () => {
    const { value, ok } = await readJSON<AiThreads>(KEY, {});
    readFailed = !ok;
    if (ok && value && typeof value === 'object') threads = trim(value);
    loaded = true;
    loading = null;
    notify();
  })();
  return loading;
}

function persist() {
  if (!loaded || readFailed) return;
  void saveJSON(KEY, trim(threads));
}

export function getAiThread(thread: string): AiChatMsg[] {
  return threads[thread] ?? [];
}

/** Заменить переписку целиком (принимает и функцию-обновление, как setState). */
export function setAiThread(thread: string, next: AiChatMsg[] | ((prev: AiChatMsg[]) => AiChatMsg[])) {
  const prev = threads[thread] ?? [];
  const value = typeof next === 'function' ? (next as (p: AiChatMsg[]) => AiChatMsg[])(prev) : next;
  threads = { ...threads, [thread]: value };
  notify();
  persist();
}

export function clearAiThread(thread: string) {
  const { [thread]: _drop, ...rest } = threads;
  threads = rest;
  notify();
  persist();
}

/** Сбросить всё в памяти — при выходе из аккаунта (ключ чистит `reset.ts`). */
export function resetAiChatState() {
  threads = {};
  loaded = false;
  loading = null;
  readFailed = false;
  notify();
}

/** Подписка на одну переписку. `ready` — история уже поднята с диска. */
export function useAiThread(thread: string) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    void loadAiChat();
    return () => { subs.delete(fn); };
  }, []);
  return {
    messages: threads[thread] ?? [],
    ready: loaded,
    setMessages: (next: AiChatMsg[] | ((prev: AiChatMsg[]) => AiChatMsg[])) => setAiThread(thread, next),
    clear: () => clearAiThread(thread),
  };
}
