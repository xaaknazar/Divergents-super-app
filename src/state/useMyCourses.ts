// Loads the signed-in user's owned courses from the authenticated mobile API.
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Course } from '../data/courses';
import { fetchMyCourses } from '../data/api';
import { useCourses } from './CourseContext';

export function useMyCourses() {
  const { isSignedIn, getToken } = useAuth();
  const { mergeServerProgress } = useCourses();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  // Network/auth failure flag so the UI can show an offline/retry state
  // instead of an empty list that looks like the user lost their purchases.
  const [error, setError] = useState(false);

  // Keep the latest getToken / mergeServerProgress in refs so the effect
  // doesn't depend on their (unstable) identity — depending on them causes an
  // infinite render loop.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const mergeRef = useRef(mergeServerProgress);
  mergeRef.current = mergeServerProgress;

  const run = useCallback(async () => {
    if (!isSignedIn) { setCourses([]); setError(false); setReady(true); return; }
    setLoading(true);
    setError(false);
    try {
      const token = await getTokenRef.current();
      if (token) {
        const list = await fetchMyCourses(token);
        setCourses(list);
        mergeRef.current(list);
      } else {
        setCourses([]);
      }
    } catch {
      // Keep whatever we already had; surface an error so the UI offers retry.
      setError(true);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [isSignedIn]);

  useEffect(() => { run(); }, [run]);

  return { courses, loading, ready, error, isSignedIn, reload: run };
}
