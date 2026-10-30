import { BADGES, computeAchievements, type AchievementStats, type Metric } from './achievementCatalog';
import type { AchievementUpdate } from './achievementEvents';
import type { FitnessProgram } from './fitness';
import type { Workout } from '../state/ActivityContext';
import type { ChallengeHistoryItem } from './community';

export interface AchievementLedger {
  version: 1;
  facts: Partial<Record<Metric, string[]>>;
  maxima: AchievementStats;
  unlocked: Record<string, string>;
}
export const emptyAchievementLedger = (): AchievementLedger => ({ version: 1, facts: {}, maxima: {}, unlocked: {} });
const metrics = new Set(BADGES.map(b => b.metric));
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function normalizeAchievementLedger(raw: unknown): AchievementLedger {
  const out = emptyAchievementLedger();
  if (!raw || typeof raw !== 'object') return out;
  const value = raw as Partial<AchievementLedger>;
  if (value.version !== 1) return out;
  for (const metric of metrics) {
    const ids = value.facts?.[metric];
    if (Array.isArray(ids)) out.facts[metric] = [...new Set(ids.filter(id => typeof id === 'string' && id.length > 0 && id.length < 512))];
    const n = value.maxima?.[metric];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out.maxima[metric] = Math.floor(n);
  }
  for (const badge of BADGES) {
    const date = value.unlocked?.[badge.id];
    if (typeof date === 'string' && Number.isFinite(Date.parse(date))) out.unlocked[badge.id] = date;
  }
  return out;
}

/** Civil-day arithmetic avoids DST/UTC shifts; matches personal programs. */
export function longestDayStreak(keys: string[], today = dayKey(new Date())): number {
  const days = [...new Set(keys.filter(k => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || k > today) return false;
    const date = new Date(`${k}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === k;
  }).map(k => Date.parse(`${k}T00:00:00Z`) / 86400000))].sort((a, b) => a - b);
  let best = 0, run = 0, previous = -Infinity;
  for (const day of days) { run = day === previous + 1 ? run + 1 : 1; best = Math.max(best, run); previous = day; }
  return best;
}

export function ledgerStats(ledger: AchievementLedger): AchievementStats {
  const stats = { ...ledger.maxima };
  for (const metric of metrics) stats[metric] = Math.max(stats[metric] ?? 0, ledger.facts[metric]?.length ?? 0);
  stats.programStreak = Math.max(stats.programStreak ?? 0, longestDayStreak(ledger.facts.programDays ?? []));
  return stats;
}

export function applyAchievementUpdate(previous: AchievementLedger, update: AchievementUpdate, now = new Date().toISOString()) {
  const next: AchievementLedger = { ...previous, facts: { ...previous.facts }, maxima: { ...previous.maxima }, unlocked: { ...previous.unlocked } };
  let changed = false;
  for (const metric of metrics) {
    const incoming = update.facts?.[metric];
    if (incoming) {
      const before = previous.facts[metric] ?? [];
      const ids = [...new Set([...before, ...incoming.filter(id => typeof id === 'string' && id.length > 0 && id.length < 512)])];
      if (ids.length !== before.length) { next.facts[metric] = ids; changed = true; }
    }
    const n = update.maxima?.[metric];
    if (typeof n === 'number' && Number.isFinite(n) && n > (previous.maxima[metric] ?? 0)) {
      next.maxima[metric] = Math.floor(n); changed = true;
    }
  }
  const newIds: string[] = [];
  for (const badge of computeAchievements(ledgerStats(next), next.unlocked)) {
    if (badge.earned && !next.unlocked[badge.id]) { next.unlocked[badge.id] = now; newIds.push(badge.id); changed = true; }
  }
  return { ledger: changed ? next : previous, newIds };
}

export function fitnessAchievementUpdate(programs: FitnessProgram[], workouts: Workout[], goals: { id: string; doneISO?: string }[], now = new Date()): AchievementUpdate {
  const today = dayKey(now);
  const programDays = new Set<string>();
  const completed: string[] = [];
  const validPrograms = programs.filter(p => Number.isFinite(p.target) && p.target > 0 && Number.isInteger(p.days) && p.days > 0 && p.days <= 366 && /^\d{4}-\d{2}-\d{2}$/.test(p.startKey) && p.startKey <= today);
  for (const p of validPrograms) {
    const start = Date.parse(`${p.startKey}T00:00:00Z`);
    let done = 0;
    for (let i = 0; i < p.days; i++) {
      if (!Number.isFinite(start)) break;
      const key = new Date(start + i * 86400000).toISOString().slice(0, 10);
      const v = p.log[key];
      if (key <= today && Number.isFinite(v) && v >= p.target) { programDays.add(key); done++; }
    }
    if (done === p.days) completed.push(p.id);
  }
  return { facts: {
    programsStarted: validPrograms.map(p => p.id), programDays: [...programDays], programsCompleted: completed,
    workoutsDone: workouts.filter(w => Number.isFinite(w.durationSec) && w.durationSec >= 300 && Number.isFinite(Date.parse(w.dateISO)) && Date.parse(w.dateISO) <= now.getTime()).map(w => w.id),
    fitnessGoals: goals.filter(g => g.doneISO && Number.isFinite(Date.parse(g.doneISO)) && Date.parse(g.doneISO) <= now.getTime()).map(g => g.id),
  } };
}

export function challengeAchievementUpdate(history: ChallengeHistoryItem[]): AchievementUpdate {
  const joined = history.filter(h => h.status === 'approved');
  const finished = joined.filter(h => h.finished && h.result && !h.result.eliminated && !h.result.left);
  return { silent: true, source: 'challenge-history', facts: {
    challengeJoined: joined.map(h => h.challengeId), challengeFinished: finished.map(h => h.challengeId),
    rankTop3: finished.filter(h => h.result!.teamRank > 0 && h.result!.teamRank <= 3).map(h => h.challengeId),
  } };
}
