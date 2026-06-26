// Client for the Divergents AI assistant — POST /api/mobile/ai.
//
// The LLM runs entirely server-side. The app only sends the running
// conversation and renders the returned text (simulating streaming locally on
// the client). No model logic, prompts or secrets live here.
//
// DEFERRED: the course-specific tutor (POST /api/ai/chat with
// { courseId, message, history } → { answer, sources }) lives in
// src/data/api.ts (askCourseAI), not here. That route is OUTSIDE
// /api/mobile and was not part of the server scan — verify /api/ai/chat
// actually exists/returns this shape on divergents-lms.kz before relying on it.
import { API_BASE } from '../config';

export type AiRole = 'user' | 'assistant';
export interface AiMessage { role: AiRole; content: string }

export interface AskAiResult { answer: string }

// Thrown when the server has no AI endpoint yet (404 / 501). The UI shows a
// graceful «AI скоро будет доступен» state instead of a network error.
export class AiUnavailableError extends Error {
  constructor() {
    super('AI_UNAVAILABLE');
    this.name = 'AiUnavailableError';
  }
}

interface AskAiOptions {
  profileContext?: string | null;
  timeoutMs?: number;
}

// Send the conversation to the server assistant and return its plain answer.
// Throws AiUnavailableError when the endpoint is absent, and Russian Error
// messages for auth / timeout / other failures so callers can surface them.
export async function askAi(
  messages: AiMessage[],
  token?: string | null,
  opts: AskAiOptions = {},
): Promise<AskAiResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60000);
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    // Server contract (POST /api/mobile/ai): { message, history?, profileContext? }
    // → { answer }. The caller hands us the full running conversation (history
    // turns followed by the new user message); we split it into the latest
    // `message` and the prior `history` the server expects.
    const recent = messages.slice(-12);
    const last = recent[recent.length - 1];
    const message = last?.content ?? '';
    const history = recent
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch(`${API_BASE}/api/mobile/ai`, {
      method: 'POST',
      signal: ctrl.signal,
      headers,
      body: JSON.stringify({
        message,
        ...(history.length ? { history } : {}),
        ...(opts.profileContext ? { profileContext: opts.profileContext } : {}),
      }),
    });

    // Endpoint not implemented yet → graceful "coming soon" state.
    if (res.status === 404 || res.status === 501) throw new AiUnavailableError();
    if (res.status === 401) throw new Error('Войдите, чтобы пользоваться ассистентом.');
    if (res.status === 429) throw new Error('Слишком много запросов. Попробуйте через минуту.');
    if (!res.ok) throw new Error(`Не удалось получить ответ (ошибка ${res.status}).`);

    const data: unknown = await res.json().catch(() => null);
    const answer = extractAnswer(data);
    return { answer };
  } catch (e) {
    if (e instanceof AiUnavailableError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Превышено время ожидания ответа. Попробуйте снова.');
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// Tolerant extraction: accept the documented `answer`, plus common aliases a
// server might return, so a minor shape mismatch doesn't break the chat.
function extractAnswer(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  for (const key of ['answer', 'message', 'reply', 'text', 'content'] as const) {
    const v = d[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}
