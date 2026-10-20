import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { BADGES, computeAchievements, type EarnedBadge } from '../data/achievementCatalog';
import { captureAchievementRecorder, connectAchievements, type AchievementUpdate } from '../data/achievementEvents';
import { applyAchievementUpdate, emptyAchievementLedger, fitnessAchievementUpdate, ledgerStats, normalizeAchievementLedger } from '../data/achievementProgress';
import { fetchMyCourses, fetchOwnedDetail, fetchMyTrips, fetchMyMeetups, fetchMySport } from '../data/api';
import { fetchMyShelf } from '../data/books';
import { fetchMyChallengeHistory } from '../data/community';
import { useFitness } from './FitnessContext';
import { useActivities } from './ActivityContext';
import { useChallenge } from './ChallengeContext';
import { readJSON, saveJSON } from './persist';
import { AchievementNotice } from '../components/AchievementNotice';
import { navigationRef } from '../navigation/ref';

interface AchievementState {
  badges: EarnedBadge[]; earned: number; total: number; ready: boolean; storageError: boolean;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AchievementState | null>(null);

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const { userId, getToken } = useAuth();
  const key = `dvg.achievements.v1.${(userId ?? 'guest').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const [ledger, setLedger] = useState(emptyAchievementLedger);
  const current = useRef(ledger);
  const loaded = useRef(false);
  const alive = useRef(true);
  const pending = useRef<AchievementUpdate[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState<string[]>([]);
  const [lessonRevision, setLessonRevision] = useState(0);
  const seenSources = useRef(new Set<string>());
  const tokenRef = useRef(getToken); tokenRef.current = getToken;
  const fitness = useFitness();
  const activity = useActivities();
  const { challenge, isParticipant, activeChallenges } = useChallenge();

  const accept = useCallback((update: AchievementUpdate) => {
    if (!alive.current) return;
    if (!loaded.current) { pending.current.push(update); return; }
    const silent = update.source ? !seenSources.current.has(update.source) && update.silent !== false : update.silent;
    if (update.source) seenSources.current.add(update.source);
    const result = applyAchievementUpdate(current.current, update);
    if (result.ledger === current.current) return;
    current.current = result.ledger;
    setLedger(result.ledger);
    void saveJSON(key, result.ledger);
    if (!silent && result.newIds.length) {
      setNotice(previous => [...new Set([...previous, ...result.newIds])]);
    }
    if (!update.silent && update.facts?.lessonsDone?.length) setLessonRevision(n => n + 1);
  }, [key]);

  const hydration = useRef<Promise<void> | null>(null);
  const hydrate = useCallback(async () => {
    if (loaded.current || !userId) return;
    if (hydration.current) return hydration.current;
    const work = (async () => {
      const saved = await readJSON<unknown>(key, null);
      if (!alive.current) return;
      if (!saved.ok) { setStorageError(true); return; } // Never overwrite an unreadable collection.
      current.current = normalizeAchievementLedger(saved.value);
      loaded.current = true;
      setLedger(current.current); setReady(true); setStorageError(false);
      const queued = pending.current.splice(0);
      for (const update of queued) accept(update);
    })();
    hydration.current = work;
    try { await work; } finally { hydration.current = null; }
  }, [key, userId, accept]);

  useEffect(() => {
    alive.current = true;
    if (!userId) { setReady(true); return () => { alive.current = false; }; }
    const disconnect = connectAchievements(key, accept, () => { alive.current = false; pending.current = []; }, userId);
    void hydrate();
    return () => { alive.current = false; disconnect(); };
  }, [userId, key, accept, hydrate]);

  const refreshing = useRef(false);
  const detailVersions = useRef(new Map<string, number>());
  const syncCourses = useCallback(async (token: string, silent = true) => {
    const courses = await fetchMyCourses(token, silent);
    const pendingDetails = courses.filter(c => (c.serverProgress ?? 0) > 0 && detailVersions.current.get(c.id) !== c.serverProgress);
    // Restore exact lesson IDs, not an estimate from a rounded percentage.
    // Bound concurrency and re-fetch only changed progress, never every screen.
    const worker = async () => {
      while (alive.current && pendingDetails.length) {
        const course = pendingDetails.shift()!;
        try {
          await fetchOwnedDetail(course.id, token);
          if (alive.current) detailVersions.current.set(course.id, course.serverProgress!);
        } catch { /* Retry on the next refresh; don't award mock/offline progress. */ }
      }
    };
    await Promise.all([worker(), worker()]);
  }, []);
  const refresh = useCallback(async () => {
    await hydrate();
    if (!userId || !alive.current || refreshing.current) return;
    refreshing.current = true;
    try {
      const token = await tokenRef.current();
      if (!token || !alive.current) return;
      // All source APIs emit confirmed, deduplicated facts. Failed reads never
      // lower progress. No new endpoint or paid entitlement is required.
      await Promise.allSettled([syncCourses(token), fetchMyShelf(token), fetchMyChallengeHistory(token),
        fetchMyTrips(token), fetchMyMeetups(token), fetchMySport(token)]);
    } catch { /* Expired auth/offline: retain the existing collection. */ }
    finally { refreshing.current = false; }
  }, [hydrate, userId, syncCourses]);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => sub.remove();
  }, [refresh]);
  useEffect(() => {
    if (!lessonRevision) return;
    let valid = true;
    void (async () => {
      try { const token = await tokenRef.current(); if (token && valid && alive.current) await syncCourses(token, false); } catch { /* foreground retry */ }
    })();
    return () => { valid = false; };
  }, [lessonRevision, syncCourses]);

  const fitnessPrimed = useRef(false);
  useEffect(() => {
    if (!userId || !fitness.loaded || !activity.loaded) return;
    captureAchievementRecorder()({ ...fitnessAchievementUpdate(fitness.programs, activity.workouts, fitness.goals), silent: !fitnessPrimed.current });
    fitnessPrimed.current = true;
  }, [userId, fitness.loaded, fitness.programs, fitness.goals, activity.loaded, activity.workouts]);

  useEffect(() => {
    captureAchievementRecorder()({ facts: { challengeJoined: activeChallenges?.map(c => c.id) ?? (isParticipant ? [challenge.id] : []) }, silent: true, source: 'active-challenge' });
  }, [isParticipant, challenge.id, activeChallenges]);

  const badges = useMemo(() => computeAchievements(ledgerStats(ledger), ledger.unlocked), [ledger]);
  const value = useMemo(() => ({ badges, earned: badges.filter(b => b.earned).length, total: badges.length, ready, storageError, refresh }), [badges, ready, storageError, refresh]);
  const first = BADGES.find(b => b.id === notice[0]);
  useEffect(() => {
    if (!first) return;
    AccessibilityInfo.announceForAccessibility(`Новое достижение: ${first.title}${notice.length > 1 ? `. И ещё ${notice.length - 1}` : ''}`);
    // No animation, sound or haptic: respects reduced motion and audio playback.
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Screen-reader users can dismiss explicitly; don't remove an action while
    // it is being explored. All awards stay available in the profile collection.
    void AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
      if (active && !enabled) timer = setTimeout(() => setNotice([]), 9000);
    }).catch(() => {});
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [first, notice.length]);

  return <Ctx.Provider value={value}>
    {children}
    {first ? <AchievementNotice badge={first} count={notice.length} onOpen={() => {
        if (navigationRef.isReady()) navigationRef.navigate('Tabs', { screen: 'ProfileTab', params: { screen: 'Achievements', initial: false } });
        setNotice([]);
      }} onClose={() => setNotice([])} /> : null}
  </Ctx.Provider>;
}

export function useAchievements(): AchievementState {
  const state = useContext(Ctx);
  if (!state) throw new Error('useAchievements must be used within AchievementProvider');
  return state;
}
