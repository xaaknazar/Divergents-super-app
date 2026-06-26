// Tracks the live daily challenge: metric inputs (steps, pages) and the binary
// "no sugar" toggle. Today's points (incl. over-goal bonus) roll up into the
// team leaderboard so the user's rank updates live. The active challenge and
// its full team are loaded from the website API; the user's daily inputs are
// persisted on-device so progress survives app launches.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import {
  DEFAULT_CHALLENGE, Challenge, ChallengeTask, Member, fetchActiveChallenge, postChallengeProgress,
  challengePointsToday, challengeBonusToday, taskPoints, taskBonus, taskDone,
} from '../data/community';

export interface RankedMember extends Member { rank: number; points: number }

interface ChallengeState {
  challenge: Challenge;
  loading: boolean;
  setMetric: (taskId: string, value: number) => void;
  toggleBinary: (taskId: string) => void;
  pointsToday: number;
  bonusToday: number;
  leaderboard: RankedMember[];
  myRank: number;
  teamPoints: number;
}

const Ctx = createContext<ChallengeState | null>(null);

const PROGRESS_KEY = 'dvg.challengeProgress.v1';

interface SavedProgress {
  id: string;
  tasks: { id: string; current?: number; done?: boolean }[];
}

// Overlay persisted daily inputs onto a challenge's task definitions (only when
// the saved progress belongs to the same challenge).
function applyProgress(base: Challenge, saved: SavedProgress | null): Challenge {
  if (!saved || saved.id !== base.id) return base;
  return {
    ...base,
    tasks: base.tasks.map((t) => {
      const s = saved.tasks.find((x) => x.id === t.id);
      if (!s) return t;
      if (t.kind === 'metric') return { ...t, current: Math.max(0, s.current ?? t.current) };
      return { ...t, done: s.done ?? t.done };
    }),
  };
}

function toSaved(c: Challenge): SavedProgress {
  return {
    id: c.id,
    tasks: c.tasks.map((t) => (t.kind === 'metric' ? { id: t.id, current: t.current } : { id: t.id, done: t.done })),
  };
}

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [challenge, setChallenge] = useState<Challenge>(DEFAULT_CHALLENGE);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const savedRef = useRef<SavedProgress | null>(null);
  // Keep the latest getToken in a ref so the load effect can run once without
  // re-subscribing every time Clerk hands back a new function identity.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // Load persisted progress first, then enrich with the server's active
  // challenge + leaderboard (re-applying the saved daily inputs by task id).
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await loadJSON<SavedProgress | null>(PROGRESS_KEY, null);
      savedRef.current = saved;
      if (alive && saved && saved.id === DEFAULT_CHALLENGE.id) {
        setChallenge(applyProgress(DEFAULT_CHALLENGE, saved));
      }
      const token = isSignedIn ? await getTokenRef.current() : null;
      const { challenge: live, members: m } = await fetchActiveChallenge(token);
      if (!alive) return;
      if (live) {
        setChallenge(applyProgress(live, savedRef.current));
        setMembers(m);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [isSignedIn]);

  // Best-effort server sync of a single daily task update. Local optimistic
  // state stays the source of truth, so failures are ignored. The local-only
  // DEFAULT_CHALLENGE has no server counterpart, so it never syncs.
  const syncTask = useCallback((challengeId: string, body: { taskId: string; value?: number; done?: boolean }) => {
    if (!challengeId || challengeId === DEFAULT_CHALLENGE.id) return;
    Promise.resolve(getTokenRef.current())
      .then((token) => postChallengeProgress(challengeId, body, token))
      .catch(() => {});
  }, []);

  const persist = useCallback((c: Challenge) => {
    const snap = toSaved(c);
    savedRef.current = snap;
    saveJSON(PROGRESS_KEY, snap);
  }, []);

  const setMetric = useCallback((taskId: string, value: number) => {
    const safe = Math.max(0, value);
    setChallenge((prev) => {
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId && t.kind === 'metric' ? { ...t, current: safe } : t),
      };
      persist(next);
      syncTask(next.id, { taskId, value: safe });
      return next;
    });
  }, [persist, syncTask]);

  const toggleBinary = useCallback((taskId: string) => {
    setChallenge((prev) => {
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId && t.kind === 'binary' ? { ...t, done: !t.done } : t),
      };
      const updated = next.tasks.find((t) => t.id === taskId);
      const done = updated && updated.kind === 'binary' ? updated.done : undefined;
      persist(next);
      if (done !== undefined) syncTask(next.id, { taskId, done });
      return next;
    });
  }, [persist, syncTask]);

  const value = useMemo<ChallengeState>(() => {
    const pointsToday = challengePointsToday(challenge.tasks);
    const bonusToday = challengeBonusToday(challenge.tasks);

    // user's live points = season base + today's earned points. Eliminated
    // members are frozen (🏳️): their points never change, not even the user's.
    const ranked = members
      .map((m) => ({ ...m, points: m.isMe && !m.eliminated ? m.weekBase + pointsToday : m.weekBase }))
      .sort((a, b) => b.points - a.points)
      .map((m, i) => ({ ...m, rank: i + 1 }));

    const myRank = ranked.find((m) => m.isMe)?.rank ?? 0;
    // Sum ALL team members (full roster from the server), not a subset.
    const teamPoints = ranked.reduce((s, m) => s + m.points, 0);

    return { challenge, loading, setMetric, toggleBinary, pointsToday, bonusToday, leaderboard: ranked, myRank, teamPoints };
  }, [challenge, members, loading, setMetric, toggleBinary]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChallenge() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChallenge must be used within ChallengeProvider');
  return c;
}

export { taskPoints, taskBonus, taskDone };
