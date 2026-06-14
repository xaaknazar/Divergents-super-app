// Tracks the live 21-day challenge: metric inputs (steps, pages), the binary
// "no sugar" toggle, and rolls today's points (incl. over-goal bonus) up into
// the team leaderboard so the user's rank updates live.
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import {
  INITIAL_CHALLENGE, Challenge, ChallengeTask, TEAM_MEMBERS, Member,
  challengePointsToday, challengeBonusToday, taskPoints, taskBonus, taskDone,
} from '../data/community';

export interface RankedMember extends Member { rank: number; points: number }

interface ChallengeState {
  challenge: Challenge;
  setMetric: (taskId: string, value: number) => void;
  toggleBinary: (taskId: string) => void;
  pointsToday: number;
  bonusToday: number;
  leaderboard: RankedMember[];
  myRank: number;
  teamPoints: number;
}

const Ctx = createContext<ChallengeState | null>(null);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const [challenge, setChallenge] = useState<Challenge>(INITIAL_CHALLENGE);

  const setMetric = useCallback((taskId: string, value: number) => {
    setChallenge((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId && t.kind === 'metric' ? { ...t, current: Math.max(0, value) } : t),
    }));
  }, []);

  const toggleBinary = useCallback((taskId: string) => {
    setChallenge((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId && t.kind === 'binary' ? { ...t, done: !t.done } : t),
    }));
  }, []);

  const value = useMemo<ChallengeState>(() => {
    const pointsToday = challengePointsToday(challenge.tasks);
    const bonusToday = challengeBonusToday(challenge.tasks);

    // user's live points = season base + today's earned points
    const ranked = TEAM_MEMBERS.map((m) => ({
      ...m,
      points: m.isMe ? m.weekBase + pointsToday : m.weekBase,
    }))
      .sort((a, b) => b.points - a.points)
      .map((m, i) => ({ ...m, rank: i + 1 }));

    const myRank = ranked.find((m) => m.isMe)?.rank ?? 0;
    const teamPoints = ranked.reduce((s, m) => s + m.points, 0);

    return { challenge, setMetric, toggleBinary, pointsToday, bonusToday, leaderboard: ranked, myRank, teamPoints };
  }, [challenge, setMetric, toggleBinary]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChallenge() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChallenge must be used within ChallengeProvider');
  return c;
}

export { taskPoints, taskBonus, taskDone };
