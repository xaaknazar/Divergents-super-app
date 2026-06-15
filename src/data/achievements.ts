// Achievements / badges — earned from course completion and challenge progress.
import { useMemo } from 'react';
import { useCourses } from '../state/CourseContext';
import { useMyCourses } from '../state/useMyCourses';
import { useChallenge } from '../state/ChallengeContext';

export type Metric =
  | 'lessonsDone' | 'coursesDone' | 'coursesOwned' | 'challengeDay' | 'challengeJoined' | 'rankTop3';

export interface Badge {
  id: string; title: string; desc: string; icon: string; color: string;
  metric: Metric; goal: number;
}

export interface EarnedBadge extends Badge {
  value: number; earned: boolean; progress: number; // 0..1
}

export const BADGES: Badge[] = [
  { id: 'first-step',  title: 'Первый шаг',   desc: 'Пройди первый урок',           icon: 'checkmark.seal.fill', color: '#34C759', metric: 'lessonsDone',     goal: 1 },
  { id: 'first-course',title: 'Первый курс',  desc: 'Заверши один курс',            icon: 'graduationcap.fill',  color: '#3D5BDB', metric: 'coursesDone',     goal: 1 },
  { id: 'enthusiast',  title: 'Знаток',       desc: 'Заверши 5 курсов',             icon: 'star.fill',           color: '#FF9500', metric: 'coursesDone',     goal: 5 },
  { id: 'scholar',     title: 'Эрудит',       desc: 'Заверши 10 курсов',            icon: 'crown.fill',          color: '#AF52DE', metric: 'coursesDone',     goal: 10 },
  { id: 'enrolled',    title: 'В деле',       desc: 'Открой первый платный курс',   icon: 'cart.fill',           color: '#0EA5E9', metric: 'coursesOwned',    goal: 1 },
  { id: 'challenger',  title: 'Челленджер',   desc: 'Вступи в 21 Days Challenge',   icon: 'flame.fill',          color: '#FF3B30', metric: 'challengeJoined', goal: 1 },
  { id: 'week-streak', title: 'Неделя силы',  desc: '7 дней челленджа',             icon: 'bolt.fill',           color: '#FF9F0A', metric: 'challengeDay',    goal: 7 },
  { id: 'finisher',    title: '21 день',      desc: 'Пройди челлендж до конца',     icon: 'trophy.fill',         color: '#30D158', metric: 'challengeDay',    goal: 21 },
  { id: 'podium',      title: 'Топ-3',        desc: 'Попади в тройку команды',      icon: 'medal.fill',          color: '#E0A100', metric: 'rankTop3',       goal: 1 },
];

export interface AchievementStats {
  lessonsDone: number;
  coursesDone: number;
  coursesOwned: number;
  challengeDay: number;
  challengeJoined: number;
  rankTop3: number;
}

export function computeAchievements(s: AchievementStats): EarnedBadge[] {
  return BADGES.map((b) => {
    const value = s[b.metric] ?? 0;
    const progress = Math.min(1, b.goal ? value / b.goal : 0);
    return { ...b, value, earned: value >= b.goal, progress };
  });
}

// Live hook: pulls real progress from the app's contexts.
export function useAchievements() {
  const { courses, completedCount, progress } = useCourses();
  const my = useMyCourses();
  const { challenge, myRank } = useChallenge();

  return useMemo(() => {
    const lessonsDone = courses.reduce((sum, c) => sum + completedCount(c.id), 0);
    const localDone = courses.filter((c) => progress(c.id) >= 1).length;
    const ownedDone = my.courses.filter((c) => (c.serverProgress ?? 0) >= 100).length;
    const coursesDone = Math.max(localDone, ownedDone);
    const coursesOwned = my.courses.length;
    const challengeDay = challenge?.currentDay ?? 0;
    const challengeJoined = challengeDay > 0 ? 1 : 0;
    const rankTop3 = myRank > 0 && myRank <= 3 ? 1 : 0;

    const badges = computeAchievements({
      lessonsDone, coursesDone, coursesOwned, challengeDay, challengeJoined, rankTop3,
    });
    const earned = badges.filter((b) => b.earned).length;
    return { badges, earned, total: badges.length };
  }, [courses, my.courses, challenge, myRank, completedCount, progress]);
}
