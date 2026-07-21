// User-side moderation for user-generated content (App Store Guideline 1.2).
// Lets the user BLOCK an author — their content (reviews, posts, comments) is
// hidden locally everywhere — and REPORT objectionable content. The block list
// is persisted per-user (dvg.blockedAuthors, wiped on sign-out via reset.ts).
//
// Authors are matched by their display name (the only identifier the API
// exposes on reviews/posts). Matching is case/space-insensitive.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './persist';

const KEY = 'dvg.blockedAuthors';
const norm = (a?: string | null) => (a ?? '').trim().toLowerCase();

interface Moderation {
  blocked: string[];                       // original display names
  isBlocked: (author?: string | null) => boolean;
  block: (author: string) => void;
  unblock: (author: string) => void;
}

const Ctx = createContext<Moderation | null>(null);

export function ModerationProvider({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    loadJSON<string[]>(KEY, []).then((v) => setBlocked(Array.isArray(v) ? v : []));
  }, []);

  const persist = useCallback((next: string[]) => { setBlocked(next); saveJSON(KEY, next); }, []);
  const isBlocked = useCallback((a?: string | null) => blocked.some((b) => norm(b) === norm(a)), [blocked]);
  const block = useCallback((a: string) => {
    if (norm(a) && !blocked.some((b) => norm(b) === norm(a))) persist([...blocked, a.trim()]);
  }, [blocked, persist]);
  const unblock = useCallback((a: string) => persist(blocked.filter((b) => norm(b) !== norm(a))), [blocked, persist]);

  return <Ctx.Provider value={{ blocked, isBlocked, block, unblock }}>{children}</Ctx.Provider>;
}

export function useModeration() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useModeration must be used within ModerationProvider');
  return c;
}
