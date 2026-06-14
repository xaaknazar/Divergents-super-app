// Tracks per-course lesson completion. Drives progress %, the "continue"
// action, and sequential lesson unlocking across the LMS module.
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { COURSES, getCourse } from '../data/courses';

export type LessonStatus = 'done' | 'current' | 'available' | 'locked';

interface CourseState {
  completed: Record<string, string[]>;            // courseId -> completed lesson ids
  completeLesson: (courseId: string, lessonId: string) => void;
  resetCourse: (courseId: string) => void;
  completedCount: (courseId: string) => number;
  progress: (courseId: string) => number;          // 0..1
  currentLessonIndex: (courseId: string) => number; // first incomplete
  lessonStatus: (courseId: string, index: number) => LessonStatus;
  isCompleted: (courseId: string, lessonId: string) => boolean;
}

const Ctx = createContext<CourseState | null>(null);

// Seed: the "Лидерство" course has the first 3 lessons completed (matches design).
const SEED: Record<string, string[]> = { leadership: ['l1', 'l2', 'l3'] };

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [completed, setCompleted] = useState<Record<string, string[]>>(SEED);

  const completeLesson = useCallback((courseId: string, lessonId: string) => {
    setCompleted((prev) => {
      const list = prev[courseId] ?? [];
      if (list.includes(lessonId)) return prev;
      return { ...prev, [courseId]: [...list, lessonId] };
    });
  }, []);

  const resetCourse = useCallback((courseId: string) => {
    setCompleted((prev) => ({ ...prev, [courseId]: [] }));
  }, []);

  const value = useMemo<CourseState>(() => {
    const completedCount = (courseId: string) => (completed[courseId] ?? []).length;
    const totalOf = (courseId: string) => getCourse(courseId)?.lessons.length ?? 0;
    const progress = (courseId: string) => {
      const total = totalOf(courseId);
      return total ? completedCount(courseId) / total : 0;
    };
    const currentLessonIndex = (courseId: string) => {
      const course = getCourse(courseId);
      if (!course) return 0;
      const done = completed[courseId] ?? [];
      const idx = course.lessons.findIndex((l) => !done.includes(l.id));
      return idx === -1 ? course.lessons.length - 1 : idx;
    };
    const lessonStatus = (courseId: string, index: number): LessonStatus => {
      const course = getCourse(courseId);
      if (!course) return 'locked';
      const done = completed[courseId] ?? [];
      const lesson = course.lessons[index];
      if (done.includes(lesson.id)) return 'done';
      const current = currentLessonIndex(courseId);
      if (index === current) return 'current';
      if (index === current + 1) return 'available';
      return 'locked';
    };
    const isCompleted = (courseId: string, lessonId: string) =>
      (completed[courseId] ?? []).includes(lessonId);

    return { completed, completeLesson, resetCourse, completedCount, progress, currentLessonIndex, lessonStatus, isCompleted };
  }, [completed, completeLesson, resetCourse]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourses() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCourses must be used within CourseProvider');
  return c;
}

export { COURSES };
