// Resolves whether the signed-in user is a creator/admin who may publish
// community content (challenges, trips, channels). The website verifies the
// Clerk session token (Bearer) and answers { canCreate: boolean }. On any
// failure we default to canCreate:false so the create entry points stay hidden
// — never a crash, never an accidentally-exposed admin action.
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE } from '../config';

export function useRole() {
  const { isSignedIn, getToken } = useAuth();
  const [canCreate, setCanCreate] = useState(false);
  const [ready, setReady] = useState(false);

  // Keep the latest getToken in a ref so the effect runs once and doesn't
  // re-subscribe every time Clerk hands back a new function identity.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const run = useCallback(async () => {
    if (!isSignedIn) { setCanCreate(false); setReady(true); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const token = await getTokenRef.current();
      if (!token) { setCanCreate(false); return; }
      const res = await fetch(`${API_BASE}/api/mobile/me/role`, {
        signal: ctrl.signal,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setCanCreate(false); return; }
      const data = await res.json();
      setCanCreate(data?.canCreate === true);
    } catch {
      setCanCreate(false);
    } finally {
      clearTimeout(timer);
      setReady(true);
    }
  }, [isSignedIn]);

  useEffect(() => { run(); }, [run]);

  return { canCreate, ready, reload: run };
}
