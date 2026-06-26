// Courses state: fetches the live catalog from the Divergents website, lazily
// loads per-course detail (chapters), and tracks local lesson completion.
// Content is API-driven only — there is no bundled fake catalog. When the
// website API is unreachable or empty, the screens render proper Russian
// loading / empty / error states instead of placeholder data.
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Course } from '../data/courses';
import { fetchCatalog, fetchCourseDetail, fetchOwnedDetail, markLessonComplete } from '../data/api';
import { loadJSON, saveJSON } from './persist';

export type LessonStatus = 'done' | 'current' | 'available' | 'locked';
export type DataSource = 'live' | 'mock' | 'loading';

interface CourseState {
  courses: Course[];
  source: DataSource;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;

  getCourse: (id: string) => Course | undefined;
  loadDetail: (id: string, token?: string | null) => Promise<void>;
  detailLoading: Record<string, boolean>;
  // Merge server-side progress (0..100) for owned courses into the catalog so
  // progress() / the detail screen reflect what was completed on the website.
  mergeServerProgress: (list: { id: string; serverProgress?: number }[]) => void;

  completed: Record<string, string[]>;
  completeLesson: (courseId: string, lessonId: string, token?: string | null) => void;
  isCompleted: (courseId: string, lessonId: string) => boolean;
  completedCount: (courseId: string) => number;
  totalLessons: (courseId: string) => number;
  progress: (courseId: string) => number;
  currentLessonIndex: (courseId: string) => number;
  lessonStatus: (courseId: string, index: number) => LessonStatus;
}

const Ctx = createContext<CourseState | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [source, setSource] = useState<DataSource>('loading');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, string[]>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  // Mirror of `courses` so reload() can tell an initial load (show skeleton,
  // clear on failure) from a pull-to-refresh (keep content, keep spinner) without
  // adding `courses` to the reload callback's deps (which would loop).
  const coursesRef = useRef<Course[]>([]);
  useEffect(() => { coursesRef.current = courses; }, [courses]);

  // Restore saved lesson progress, then persist on every change.
  useEffect(() => {
    loadJSON<Record<string, string[]>>('dvg.completed', {}).then((v) => { setCompleted(v); setHydrated(true); });
  }, []);
  useEffect(() => { if (hydrated) saveJSON('dvg.completed', completed); }, [completed, hydrated]);

  const load = useCallback(async () => {
    // Only show the full skeleton on the very first load; a pull-to-refresh
    // keeps the existing list visible under the RefreshControl spinner.
    if (coursesRef.current.length === 0) setSource('loading');
    setError(null);
    try {
      const live = await fetchCatalog();
      // API-driven only: an empty catalog stays empty (screens show an empty
      // state). We never substitute fake placeholder content.
      setCourses(live);
      setSource('live');
    } catch (e: any) {
      // Keep any previously loaded catalog so a transient refresh failure
      // doesn't blank the screen; the error drives the empty-state retry only
      // when there is nothing to show.
      if (coursesRef.current.length === 0) setCourses([]);
      setSource('live');
      setError(e?.message ?? 'network');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (id: string, token?: string | null) => {
    setDetailLoading((p) => ({ ...p, [id]: true }));
    try {
      let detail;
      if (token) {
        // Signed in: try the owned-course endpoint (unlocks Mux HLS); if the
        // user doesn't own it (403) fall back to the public catalog detail.
        try { detail = await fetchOwnedDetail(id, token); }
        catch { detail = await fetchCourseDetail(id); }
      } else {
        detail = await fetchCourseDetail(id);
      }
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...detail } : c)));
    } catch {
      // keep whatever we have (mock courses already include lessons)
    } finally {
      setDetailLoading((p) => ({ ...p, [id]: false }));
    }
  }, []);

  const mergeServerProgress = useCallback((list: { id: string; serverProgress?: number }[]) => {
    setCourses((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const m = list.find((x) => x.id === c.id);
        if (m && m.serverProgress != null && m.serverProgress !== c.serverProgress) {
          changed = true;
          return { ...c, serverProgress: m.serverProgress };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, []);

  const completeLesson = useCallback((courseId: string, lessonId: string, token?: string | null) => {
    setCompleted((prev) => {
      const list = prev[courseId] ?? [];
      if (list.includes(lessonId)) return prev;
      return { ...prev, [courseId]: [...list, lessonId] };
    });
    // Best-effort server sync so progress follows the user across devices.
    if (token) markLessonComplete(courseId, lessonId, token);
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
      const local = total ? Math.min(1, completedCount(id) / total) : 0;
      // Owned courses carry server-side progress (0..100); use whichever is
      // further along so a course completed on the website still shows real %.
      const server = Math.min(1, Math.max(0, (getCourse(id)?.serverProgress ?? 0) / 100));
      return Math.max(local, server);
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
      getCourse, loadDetail, detailLoading, mergeServerProgress,
      completed, completeLesson, isCompleted, completedCount, totalLessons,
      progress, currentLessonIndex, lessonStatus,
    };
  }, [courses, source, error, load, loadDetail, detailLoading, mergeServerProgress, completed, completeLesson]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourses() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCourses must be used within CourseProvider');
  return c;
}
