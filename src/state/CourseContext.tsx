// Courses state: fetches the live catalog from the Divergents website, lazily
// loads per-course detail (chapters), and tracks local lesson completion.
// Live content is preferred; a small bundled demo keeps the learning flow
// usable when the website API is temporarily unreachable.
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Course } from '../data/courses';
import { fetchCatalog, fetchCourseDetail, fetchOwnedDetail, markLessonComplete } from '../data/api';
import { loadJSON, saveJSON } from './persist';

// No 'locked': an owned/free course opens every lesson (the sales page is the
// only place that gates content, and it gates by `isFree`). The old 'locked'
// state was cosmetic — the rows navigated anyway — so it lied to the user.
export type LessonStatus = 'done' | 'current' | 'available';
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
  // True when the last detail fetch for a course failed AND nothing is cached
  // for it (no lessons) — the screens then show a network error with retry
  // instead of pretending the programme is «в подготовке».
  detailError: Record<string, boolean>;
  // Merge server-side progress (0..100) for owned courses into the catalog so
  // progress() / the detail screen reflect what was completed on the website.
  mergeServerProgress: (list: { id: string; serverProgress?: number }[]) => void;

  completed: Record<string, string[]>;
  completeLesson: (courseId: string, lessonId: string, token?: string | null) => Promise<boolean>;
  isCompleted: (courseId: string, lessonId: string) => boolean;
  completedCount: (courseId: string) => number;
  totalLessons: (courseId: string) => number;
  progress: (courseId: string) => number;
  currentLessonIndex: (courseId: string) => number;
  lessonStatus: (courseId: string, index: number) => LessonStatus;
}

const Ctx = createContext<CourseState | null>(null);

const MOCK_COURSES: Course[] = [{
  id: 'offline-demo',
  title: 'Знакомство с Divergents',
  author: 'Команда Divergents',
  level: 'Начальный',
  durationLabel: '15 мин',
  lessonsLabel: '2 урока',
  icon: 'sparkles',
  tint: 'rgba(35,64,136,0.12)',
  iconColor: '#234088',
  category: 'Саморазвитие',
  description: 'Короткий демо-курс доступен без сети. Видео и полный каталог появятся после восстановления подключения.',
  price: 0,
  chaptersCount: 2,
  source: 'mock',
  lessons: [
    { id: 'offline-intro', n: 1, title: 'Как устроена экосистема', duration: '7 мин · Материал', minutes: 7, description: 'Обзор возможностей приложения и персонального маршрута развития.' },
    { id: 'offline-plan', n: 2, title: 'Ваш следующий шаг', duration: '8 мин · Материал', minutes: 8, description: 'Определите ближайшую цель и выберите направление обучения.' },
  ],
}];

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [source, setSource] = useState<DataSource>('loading');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, string[]>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [detailError, setDetailError] = useState<Record<string, boolean>>({});
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
      if (coursesRef.current.length === 0) {
        setCourses(MOCK_COURSES);
        setSource('mock');
      } else {
        setSource(coursesRef.current.every((course) => course.source === 'mock') ? 'mock' : 'live');
      }
      setError(e?.message ?? 'network');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (id: string, token?: string | null) => {
    setDetailLoading((p) => ({ ...p, [id]: true }));
    setDetailError((p) => (p[id] ? { ...p, [id]: false } : p));
    try {
      let detail;
      let ownedConfirmed = false;
      if (token) {
        // Signed in: try the owned-course endpoint (unlocks Mux HLS); if the
        // user doesn't own it (403) fall back to the public catalog detail.
        // A successful owned-detail is itself proof of ownership — record it so
        // access survives even when the "Мои курсы" list fetch failed.
        try { detail = await fetchOwnedDetail(id, token); ownedConfirmed = true; }
        catch { detail = await fetchCourseDetail(id); }
      } else {
        detail = await fetchCourseDetail(id);
      }
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...detail, ...(ownedConfirmed ? { owned: true } : {}) } : c)));
      // Сервер знает, какие уроки пройдены (в том числе на сайте). Раньше в
      // приложение попадал только общий процент, поэтому в «Программе курса»
      // ни один урок не был отмечен, хотя прогресс показывал, скажем, 38%.
      // Объединяем с локальными отметками, чтобы не потерять отмеченное офлайн.
      const lessons = detail?.lessons ?? [];
      const serverDone = lessons.filter((l) => l.completed).map((l) => l.id);
      if (lessons.length > 0) {
        const liveIds = new Set(lessons.map((l) => l.id));
        setCompleted((prev) => {
          const local = prev[id] ?? [];
          // Drop ids of chapters that were unpublished or deleted. Without this
          // completedCount could exceed the lesson count and a course with
          // unfinished lessons showed 100%.
          const merged = Array.from(new Set([...local.filter((x) => liveIds.has(x)), ...serverDone]));
          const same = merged.length === local.length && merged.every((x, i) => x === local[i]);
          return same ? prev : { ...prev, [id]: merged };
        });
      }
    } catch {
      // Keep whatever we have (mock courses already include lessons). Flag the
      // failure only when there is nothing to show for this course.
      const cached = coursesRef.current.find((c) => c.id === id);
      if (!cached || cached.lessons.length === 0) setDetailError((p) => ({ ...p, [id]: true }));
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

  const completeLesson = useCallback(async (courseId: string, lessonId: string, token?: string | null): Promise<boolean> => {
    setCompleted((prev) => {
      const list = prev[courseId] ?? [];
      if (list.includes(lessonId)) return prev;
      return { ...prev, [courseId]: [...list, lessonId] };
    });
    // Offline/local courses are complete immediately. Live authenticated
    // courses return the actual sync result after the API's bounded retry.
    if (!token) return true;
    const synced = await markLessonComplete(courseId, lessonId, token);
    if (!synced) {
      // Do not show a false success. Roll the optimistic mark back so the user
      // can retry once connectivity/authentication is restored.
      setCompleted((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] ?? []).filter((id) => id !== lessonId),
      }));
    }
    return synced;
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
    // Index of the first unfinished lesson, or -1 when the whole course is done.
    // It used to return the last index in that case, so a finished course still
    // offered «Продолжить» and reopened an already completed lesson.
    const currentLessonIndex = (id: string) => {
      const c = getCourse(id);
      if (!c || c.lessons.length === 0) return 0;
      const done = completed[id] ?? [];
      return c.lessons.findIndex((l) => !done.includes(l.id));
    };
    const lessonStatus = (id: string, index: number): LessonStatus => {
      const c = getCourse(id);
      if (!c || !c.lessons[index]) return 'available';
      const done = completed[id] ?? [];
      if (done.includes(c.lessons[index].id)) return 'done';
      return index === currentLessonIndex(id) ? 'current' : 'available';
    };
    const isCompleted = (id: string, lessonId: string) => (completed[id] ?? []).includes(lessonId);

    return {
      courses, source, loading: source === 'loading', error, reload: load,
      getCourse, loadDetail, detailLoading, detailError, mergeServerProgress,
      completed, completeLesson, isCompleted, completedCount, totalLessons,
      progress, currentLessonIndex, lessonStatus,
    };
  }, [courses, source, error, load, loadDetail, detailLoading, detailError, mergeServerProgress, completed, completeLesson]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourses() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCourses must be used within CourseProvider');
  return c;
}
