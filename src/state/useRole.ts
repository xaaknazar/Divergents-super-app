import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { fetchMyRole } from '../data/api';

export function useRole() {
  const { isSignedIn, getToken } = useAuth();
  const [canCreate, setCanCreate] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSignedIn) { setCanCreate(false); return; }
      try { const token = await getToken(); const r = await fetchMyRole(token); if (alive) { setCanCreate(!!r.canCreate); setEmail(r.email ?? null); } } catch {}
    })();
    return () => { alive = false; };
  }, [isSignedIn]);
  return { canCreate, email };
}
