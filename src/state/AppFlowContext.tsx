// App flow gate: onboarding done + pending registration (анкета after sign-up).
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const OB = 'dvg.onboarded';
const PR = 'dvg.pendingRegistration';

interface Flow {
  ready: boolean;
  onboarded: boolean;
  pendingRegistration: boolean;
  completeOnboarding: () => void;
  startRegistration: () => void;
  finishRegistration: () => void;
}

const Ctx = createContext<Flow | null>(null);

export function AppFlowProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [pendingRegistration, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setOnboarded((await SecureStore.getItemAsync(OB)) === '1');
        setPending((await SecureStore.getItemAsync(PR)) === '1');
      } catch {}
      setReady(true);
    })();
  }, []);

  const completeOnboarding = useCallback(() => { setOnboarded(true); SecureStore.setItemAsync(OB, '1').catch(() => {}); }, []);
  const startRegistration = useCallback(() => { setPending(true); SecureStore.setItemAsync(PR, '1').catch(() => {}); }, []);
  const finishRegistration = useCallback(() => { setPending(false); SecureStore.setItemAsync(PR, '0').catch(() => {}); }, []);

  return <Ctx.Provider value={{ ready, onboarded, pendingRegistration, completeOnboarding, startRegistration, finishRegistration }}>{children}</Ctx.Provider>;
}

export function useAppFlow() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAppFlow must be used within AppFlowProvider');
  return c;
}
