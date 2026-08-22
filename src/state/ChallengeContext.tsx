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
  submitChallengeReport, challengePointsToday, challengeBonusToday, taskPoints, taskBonus, taskDone, totalFlags,
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
  // Team-wide disciplinary totals — visible to every member.
  teamFlags: number;
  teamPenalty: number;
  // Daily report ("отчёт за день") — deadline 23:00, server timestamps it.
  reportedToday: boolean;
  reportedAt: string | null;
  submitReport: () => Promise<boolean>;
}

const Ctx = createContext<ChallengeState | null>(null);

const PROGRESS_KEY = 'dvg.challengeProgress.v1';
const REPORT_KEY = 'dvg.challengeReport.v1';

interface SavedProgress {
  id: string;
  tasks: { id: string; current?: number; done?: boolean }[];
}

// The last submitted daily report, scoped to a challenge + day so it resets each
// new day (currentDay advances server-side).
interface SavedReport {
  id: string;
  day: number;
  reportedAt: string;
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
  const [report, setReport] = useState<SavedReport | null>(null);
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
      try {
        const saved = await loadJSON<SavedProgress | null>(PROGRESS_KEY, null);
        savedRef.current = saved;
        if (alive && saved && saved.id === DEFAULT_CHALLENGE.id) {
          setChallenge(applyProgress(DEFAULT_CHALLENGE, saved));
        }
        const savedReport = await loadJSON<SavedReport | null>(REPORT_KEY, null);
        if (alive && savedReport) setReport(savedReport);
        const token = isSignedIn ? await getTokenRef.current() : null;
        const { challenge: live, members: m } = await fetchActiveChallenge(token);
        if (!alive) return;
        if (live) {
          setChallenge(applyProgress(live, savedRef.current));
          setMembers(m);
        }
      } catch {
        // best-effort: keep the locally-restored challenge on any failure
      } finally {
        // Always clear loading, even if getToken()/fetch throws — otherwise the
        // screen would spin forever.
        if (alive) setLoading(false);
      }
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

  // Submit the daily report. Optimistic locally (instant UI), best-effort to the
  // server; on server failure it reverts so the user can retry. The server is the
  // authority on on-time vs late (23:00 deadline → −300 и 🚩).
  const submitReport = useCallback(async (): Promise<boolean> => {
    const id = challenge.id;
    const day = challenge.currentDay;
    if (!id || day <= 0) return false;
    const snap: SavedReport = { id, day, reportedAt: new Date().toISOString() };
    setReport(snap);
    saveJSON(REPORT_KEY, snap);
    if (id === DEFAULT_CHALLENGE.id) return true; // local-only scaffold, no server
    const token = await getTokenRef.current();
    const ok = await submitChallengeReport(id, token);
    if (!ok) { setReport(null); saveJSON(REPORT_KEY, null); } // revert → allow retry
    return ok;
  }, [challenge.id, challenge.currentDay]);

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
    // Team-wide discipline totals — every member sees the team's 🚩 and штрафы.
    const teamFlags = ranked.reduce((s, m) => s + totalFlags(m.flags), 0);
    const teamPenalty = ranked.reduce((s, m) => s + (m.penalty ?? 0), 0);

    // The report belongs to today only when it matches the current challenge+day.
    const reportedToday = !!report && report.id === challenge.id && report.day === challenge.currentDay;
    const reportedAt = reportedToday ? report!.reportedAt : null;

    return {
      challenge, loading, setMetric, toggleBinary, pointsToday, bonusToday,
      leaderboard: ranked, myRank, teamPoints, teamFlags, teamPenalty,
      reportedToday, reportedAt, submitReport,
    };
  }, [challenge, members, loading, setMetric, toggleBinary, report, submitReport]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChallenge() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChallenge must be used within ChallengeProvider');
  return c;
}

export { taskPoints, taskBonus, taskDone };
