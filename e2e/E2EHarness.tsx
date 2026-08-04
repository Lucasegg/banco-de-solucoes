import { useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '../src/context/AuthContext';
import { LegalConsentContext } from '../src/context/LegalConsentContext';
import { E2ENotificationsProvider } from './E2ENotificationsProvider';
import { PersistenceProvider } from '../src/integrations/supabase/PersistenceProvider';
import type { UserProfile, UserRole } from '../src/types/user';
import { CURRENT_LEGAL_VERSIONS } from '../src/legal/versions';

const id = '22222222-2222-4222-8222-222222222222';
const fixtureUser = (role: UserRole): UserProfile => ({
  id, name: role === 'admin' ? 'Admin Teste' : 'Ana Silva', username: role === 'admin' ? 'admin-teste' : 'ana',
  email: `${role}@example.test`, role: role === 'admin' ? 'Administrador(a)' : 'Colaborador(a)', roleKey: role,
  organization: 'Rede Local', city: 'Recife', state: 'PE', country: 'Brasil', bio: 'Mobilizadora comunitária',
  avatarUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E', website: 'https://example.org/ana',
  createdAt: '2025-01-01T00:00:00Z', stats: { problemsSubmitted: 1, solutionsSubmitted: 0, favoritesSaved: 0, contributionsReviewed: 0, impactScore: 10 }, achievements: [],
  settings: { emailNotifications: true, publicProfile: false, weeklyDigest: false },
});

function setting(name: string, fallback = false) { return window.localStorage.getItem(`e2e.${name}`) ?? String(fallback); }

export function E2EHarness({ children }: { children: ReactNode }) {
  const authenticated = setting('authenticated') === 'true';
  const role = setting('role', false) === 'admin' ? 'admin' : 'member';
  const [user, setUser] = useState<UserProfile | null>(() => authenticated ? fixtureUser(role) : null);
  const [mfaRequired, setMfaRequired] = useState(() => setting('mfaRequired') === 'true');
  const [mfaStatus, setMfaStatus] = useState<AuthContextValue['mfaStatus']>(() => mfaRequired ? 'challenge-required' : 'disabled');
  const [consentPending, setConsentPending] = useState(() => authenticated && setting('consentPending') === 'true');
  const session = user ? ({ access_token: 'e2e-token', refresh_token: 'e2e-refresh', expires_in: 3600, token_type: 'bearer', user: { id, email: user.email } } as unknown as AuthContextValue['session']) : null;
  const auth = useMemo<AuthContextValue>(() => ({
    user, session, authStatus: mfaRequired ? 'mfa-required' : user ? 'authenticated' : 'anonymous', isSupabaseConfigured: true,
    isAuthenticated: Boolean(user) && !mfaRequired, isLoading: false, socialAuthProvider: null, resetSocialAuthAttempt: () => undefined,
    recoveryStatus: 'idle', requestPasswordRecovery: async () => ({ ok: true }), updateRecoveredPassword: async () => ({ ok: true }), clearRecoverySession: async () => ({ ok: true }),
    signInWithProvider: async () => ({ ok: false }), login: async () => ({ ok: false }), register: async () => ({ ok: false }),
    logout: async () => { setUser(null); setMfaRequired(false); return { ok: true }; },
    updateSettings: async (changes) => { setUser((current) => current ? ({ ...current, ...changes, settings: { ...current.settings, ...changes } }) : current); return { ok: true }; },
    isUsernameAvailable: async () => ({ ok: true, available: true }),
    mfaStatus, mfaFactors: mfaRequired ? [{ id: 'e2e-factor', status: 'verified', createdAt: '2026-01-01' }] : [],
    mfaEnrollment: null, mfaRequired, currentAssuranceLevel: mfaRequired ? 'aal1' : 'aal2', nextAssuranceLevel: 'aal2',
    refreshMfaStatus: async () => ({ ok: true }), enrollTotp: async () => ({ ok: true }), verifyTotpEnrollment: async () => ({ ok: true }), cancelTotpEnrollment: async () => ({ ok: true }),
    verifyMfaChallenge: async (code) => { if (code !== '123456') return { ok: false, message: 'Código inválido.' }; setMfaStatus('enabled'); setMfaRequired(false); return { ok: true }; },
    disableTotp: async () => ({ ok: true }),
  }), [mfaRequired, mfaStatus, session, user]);
  const legal = useMemo(() => ({
    state: 'ready' as const,
    status: { requiredVersions: CURRENT_LEGAL_VERSIONS, acceptances: consentPending ? [] : [
      { documentType: 'terms' as const, documentVersion: CURRENT_LEGAL_VERSIONS.terms, locale: 'pt-BR', acceptedAt: '2026-08-01T00:00:00Z' },
      { documentType: 'privacy' as const, documentVersion: CURRENT_LEGAL_VERSIONS.privacy, locale: 'pt-BR', acceptedAt: '2026-08-01T00:00:00Z' },
    ], pending: consentPending },
    accept: async () => { setConsentPending(false); return true; }, reload: async () => undefined,
  }), [consentPending]);
  return <PersistenceProvider><AuthContext.Provider value={auth}><LegalConsentContext.Provider value={legal}><E2ENotificationsProvider>{children}</E2ENotificationsProvider></LegalConsentContext.Provider></AuthContext.Provider></PersistenceProvider>;
}
