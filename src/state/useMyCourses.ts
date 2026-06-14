// Loads the signed-in user's owned courses from the authenticated mobile API.
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Course } from '../data/courses';
import { fetchMyCourses } from '../data/api';

export function useMyCourses() {
  const { isSignedIn, getToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isSignedIn) { setCourses([]); return; }
    setLoading(true);
    try {
      const token = await getToken();
      if (token) setCourses(await fetchMyCourses(token));
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => { reload(); }, [reload]);

  return { courses, loading, isSignedIn, reload };
}
