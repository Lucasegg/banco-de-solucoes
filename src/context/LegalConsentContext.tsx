import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { legalConsentRepository } from '../repositories/legalConsent';
import type { LegalConsentStatus } from '../types/legalConsent';
import type { LegalLocale } from '../legal/versions';

export type ConsentState = { state: 'idle' | 'loading' | 'ready' | 'error'; status: LegalConsentStatus | null; accept: (locale: LegalLocale) => Promise<boolean>; reload: () => Promise<void> };
const Context = createContext<ConsentState>({ state: 'idle', status: null, accept: async () => false, reload: async () => undefined });

export function LegalConsentProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, mfaRequired, session } = useAuth();
  const [state, setState] = useState<ConsentState['state']>('idle'); const [status, setStatus] = useState<LegalConsentStatus | null>(null);
  const request = useRef(0);
  const reload = useCallback(async () => {
    const current = ++request.current;
    if (!legalConsentRepository || !isAuthenticated || mfaRequired) { setState('idle'); setStatus(null); return; }
    setState('loading'); const result = await legalConsentRepository.status();
    if (current !== request.current) return;
    if (!result.ok) { setStatus(null); setState('error'); return; }
    setStatus(result.data); setState('ready');
  }, [isAuthenticated, mfaRequired, session?.user.id]);
  useEffect(() => { void reload(); return () => { request.current += 1; }; }, [reload]);
  const accept = useCallback(async (locale: LegalLocale) => {
    if (!legalConsentRepository || state === 'loading') return false;
    setState('loading'); const result = await legalConsentRepository.accept(locale);
    if (!result.ok) { setState('error'); return false; }
    await reload(); return true;
  }, [reload, state]);
  return <Context.Provider value={{ state, status, accept, reload }}>{children}</Context.Provider>;
}
export const useLegalConsent = () => useContext(Context) as ConsentState;

