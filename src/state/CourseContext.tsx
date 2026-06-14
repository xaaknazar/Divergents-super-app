// Courses state: fetches the live catalog from the Divergents website, lazily
// loads per-course detail (chapters), and tracks local lesson completion.
// Falls back to bundled mock data if the website API is unreachable.
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { COURSES as MOCK_COURSES, Course } from '../data/courses';
import { fetchCatalog, fetchCourseDetail } from '../data/api';

export type LessonStatus = 'done' | 'current' | 'available' | 'locked';
export type DataSource = 'live' | 'mock' | 'loading';

interface CourseState {
  courses: Course[];
  source: DataSource;
  loading: boolean;
  error: string | null;
  reload: () => void;

  getCourse: (id: string) => Course | undefined;
  loadDetail: (id: string) => Promise<void>;
  detailLoading: Record<string, boolean>;

  completed: Record<string, string[]>;
  completeLesson: (courseId: string, lessonId: string) => void;
  isCompleted: (courseId: string, lessonId: string) => boolean;
  completedCount: (courseId: string) => number;
  totalLessons: (courseId: string) => number;
  progress: (courseId: string) => number;
  currentLessonIndex: (courseId: string) => number;
  lessonStatus: (courseId: string, index: number) => LessonStatus;
}

const Ctx = createContext<CourseState | null>(null);

const SEED: Record<string, string[]> = { leadership: ['l1', 'l2', 'l3'] };

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [source, setSource] = useState<DataSource>('loading');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, string[]>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setSource('loading');
    setError(null);
    try {
      const live = await fetchCatalog();
      if (live.length > 0) {
        setCourses(live);
        setSource('live');
        return;
      }
      // API reachable but empty — show mock so the app isn't blank.
      setCourses(MOCK_COURSES);
      setSource('mock');
    } catch (e: any) {
      setCourses(MOCK_COURSES);
      setCompleted((prev) => (Object.keys(prev).length ? prev : SEED));
      setSource('mock');
      setError(e?.message ?? 'network');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading((p) => ({ ...p, [id]: true }));
    try {
      const detail = await fetchCourseDetail(id);
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...detail } : c)));
    } catch {
      // keep whatever we have (mock courses already include lessons)
    } finally {
      setDetailLoading((p) => ({ ...p, [id]: false }));
    }
  }, []);

  const completeLesson = useCallback((courseId: string, lessonId: string) => {
    setCompleted((prev) => {
      const list = prev[courseId] ?? [];
      if (list.includes(lessonId)) return prev;
      return { ...prev, [courseId]: [...list, lessonId] };
    });
  }, []);

  const value = useMemo<CourseState>(() => {
    const getCourse = (id: string) => courses.find((c) => c.id === id);
    const completedCount = (id: string) => (completed[id] ?? []).length;
    const totalLessons = (id: string) => {
      const c = getCourse(id);
      return c?.lessons.length || c?.chaptersCount || 0;
    };
    const progress = (id: string) => {
      const total = totalLessons(id);
      return total ? Math.min(1, completedCount(id) / total) : 0;
    };
    const currentLessonIndex = (id: string) => {
      const c = getCourse(id);
      if (!c || c.lessons.length === 0) return 0;
      const done = completed[id] ?? [];
      const idx = c.lessons.findIndex((l) => !done.includes(l.id));
      return idx === -1 ? c.lessons.length - 1 : idx;
    };
    const lessonStatus = (id: string, index: number): LessonStatus => {
      const c = getCourse(id);
      if (!c || !c.lessons[index]) return 'locked';
      const done = completed[id] ?? [];
      if (done.includes(c.lessons[index].id)) return 'done';
      const cur = currentLessonIndex(id);
      if (index === cur) return 'current';
      if (index === cur + 1) return 'available';
      return 'locked';
    };
    const isCompleted = (id: string, lessonId: string) => (completed[id] ?? []).includes(lessonId);

    return {
      courses, source, loading: source === 'loading', error, reload: load,
      getCourse, loadDetail, detailLoading,
      completed, completeLesson, isCompleted, completedCount, totalLessons,
      progress, currentLessonIndex, lessonStatus,
    };
  }, [courses, source, error, load, loadDetail, detailLoading, completed, completeLesson]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourses() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCourses must be used within CourseProvider');
  return c;
}

export { MOCK_COURSES as COURSES };
