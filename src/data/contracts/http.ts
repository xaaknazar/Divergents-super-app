// Validated HTTP layer for the Divergents LMS API (/api/mobile/*).
//
// Every response is parsed against a Zod schema at the network boundary, so a
// backend shape change surfaces as a clear dev warning and a graceful fallback
// instead of crashing deep inside a screen. The schemas are the single source
// of truth for BOTH runtime validation AND the TypeScript types (view models are
// inferred with z.infer, so hand-written `interface ApiX` can never drift from
// what the server actually sends). This mirrors the "shared contracts" idea from
// full-stack templates, adapted to our client-only app.
import { z } from 'zod';
import { API_BASE } from '../../config';

// Result envelope every fetch returns. `error` is true when the request failed
// OR the payload didn't match the contract — screens use it to show a RETRY
// state instead of an empty one. `data` is the validated, typed payload (or null
// on any failure), so callers never touch unvalidated JSON.
export interface Fetched<T> {
  ok: boolean;
  data: T | null;
  error: boolean;
}

export interface FetchOpts {
  timeoutMs?: number;
  token?: string | null; // Clerk bearer for authed /api/mobile/me endpoints
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

// Fetch JSON and validate it against `schema`. Never throws — any network,
// parse or validation failure resolves to { ok:false, data:null, error:true }.
export async function fetchJson<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  opts: FetchOpts = {},
): Promise<Fetched<z.output<S>>> {
  const { timeoutMs = 12000, token, method = 'GET', body } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body != null ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) return { ok: false, data: null, error: true };
    let json: unknown;
    try { json = await res.json(); } catch { return { ok: false, data: null, error: true }; }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      if (__DEV__) console.warn(`[contracts] ${path} failed validation:`, parsed.error.issues.slice(0, 4));
      return { ok: false, data: null, error: true };
    }
    return { ok: true, data: parsed.data, error: false };
  } catch {
    return { ok: false, data: null, error: true };
  } finally {
    clearTimeout(timer);
  }
}

// A resilient array schema: validates each item independently and DROPS the ones
// that don't match instead of failing the whole list, so one malformed record
// from the server can never blank an entire screen. Non-array input becomes [].
// In dev, the number of dropped rows is logged.
export function arrayOf<S extends z.ZodTypeAny>(item: S, label = 'item'): z.ZodType<z.output<S>[]> {
  return z.preprocess(
    (val) => (Array.isArray(val) ? val : []),
    z.array(z.unknown()).transform((arr) => {
      const out: z.output<S>[] = [];
      let dropped = 0;
      for (const raw of arr) {
        const r = item.safeParse(raw);
        if (r.success) out.push(r.data);
        else dropped++;
      }
      if (dropped > 0 && __DEV__) console.warn(`[contracts] dropped ${dropped} invalid ${label}(s)`);
      return out;
    }),
  ) as unknown as z.ZodType<z.output<S>[]>;
}

// ─── Leniency helpers ───────────────────────────────────────────────
// The backend is a loosely-typed Next.js API — ids may arrive as strings or
// numbers, text fields may be null. These helpers keep schemas from wrongly
// rejecting otherwise-valid rows while still normalizing the shape.

// Accept a string or number id and normalize to a non-empty string. Rows without
// an id fail (and are dropped by arrayOf), matching the old `c.id != null` guard.
export const zId = z.union([z.string(), z.number()]).transform((v) => String(v)).refine((v) => v.length > 0);

// A nullable/absent string that falls back to `fallback` (default '').
export const zStr = (fallback = '') => z.string().nullish().transform((v) => v ?? fallback);

// Nullable/absent string normalized to `string | null` (never undefined) — for
// view-model fields typed `string | null` (imageUrl, description, …).
export const zStrN = z.string().nullish().transform((v) => v ?? null);

// Nullable/absent number normalized to `number | null` — for `price`, etc.
export const zNumN = z.number().nullish().transform((v) => v ?? null);
