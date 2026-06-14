// Loads the signed-in user's owned courses from the authenticated mobile API.
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Course } from '../data/courses';
import { fetchMyCourses } from '../data/api';

export function useMyCourses() {
  const { isSignedIn, getToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  // Keep the latest getToken in a ref so the effect doesn't depend on its
  // (unstable) identity — depending on it causes an infinite render loop.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const run = useCallback(async () => {
    if (!isSignedIn) { setCourses([]); return; }
    setLoading(true);
    try {
      const token = await getTokenRef.current();
      if (token) setCourses(await fetchMyCourses(token));
      else setCourses([]);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => { run(); }, [run]);

  return { courses, loading, isSignedIn, reload: run };
}
