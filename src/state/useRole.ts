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
      if (!isSignedIn) { setCanCreate(false); setEmail(null); return; }
      // Retry on transient network failure so admin controls don't vanish on a blip.
      for (let attempt = 0; attempt < 3 && alive; attempt++) {
        try {
          const token = await getToken();
          const r = await fetchMyRole(token);
          if (alive) { setCanCreate(!!r.canCreate); setEmail(r.email ?? null); }
          return;
        } catch {
          if (attempt < 2) await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
        }
      }
    })();
    return () => { alive = false; };
  }, [isSignedIn]);
  return { canCreate, email };
}
