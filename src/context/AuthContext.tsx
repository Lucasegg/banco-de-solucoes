import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from '../integrations/supabase/client';
import { supabaseConfig } from '../integrations/supabase/config';
import { ProfileRepository } from '../repositories/profiles';
import { SupabaseUserRepository } from '../repositories/users/SupabaseUserRepository';
import { MfaRepository } from '../repositories/users/MfaRepository';
import type { AssuranceLevel, MfaEnrollment, MfaFactor, MfaStatus } from '../types/mfa';
import { normalizeTotpCode, selectVerifiedFactor } from '../types/mfa';
import { clearMfaReturnTo, setMfaReturnTo } from '../repositories/users/mfaReturnTo';
import type { RegisterUserInput, UserProfile, UserSettings } from '../types/user';
import { cleanOAuthCallbackUrl, consumeOAuthReturnTo, isOAuthCallbackUrl, readOAuthCallbackParams, translateOAuthError, type SocialAuthProvider } from '../repositories/users/oauth';
import { clearPasswordRecoveryFlowState, PASSWORD_RECOVERY_ACTIVE_KEY, readRecoveryStorage, removeRecoveryStorage, writeRecoveryStorage } from '../repositories/users/passwordRecoveryState';

const SUPABASE_LOCAL_SETTINGS_KEY = 'banco-de-solucoes.supabase.profile-settings';
function hasRecoveryMarker() {
  return readRecoveryStorage(PASSWORD_RECOVERY_ACTIVE_KEY) === 'true';
}

function setRecoveryMarker(active: boolean) {
  if (active) writeRecoveryStorage(PASSWORD_RECOVERY_ACTIVE_KEY, 'true');
  else removeRecoveryStorage(PASSWORD_RECOVERY_ACTIVE_KEY);
}

export type AuthStatus = 'supabase-unconfigured' | 'loading-session' | 'anonymous' | 'authenticated' | 'profile-missing' | 'email-confirmation-pending' | 'network-error' | 'session-expired' | 'mfa-required';
export type RecoveryStatus = 'idle' | 'requesting-code' | 'code-sent' | 'verifying-code' | 'code-verified' | 'updating-password' | 'success' | 'error';

export interface AuthContextValue {
  user: UserProfile | null;
  session: Session | null;
  authStatus: AuthStatus;
  authMessage?: string;
  isSupabaseConfigured: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  socialAuthProvider: SocialAuthProvider | null;
  socialAuthError?: string;
  resetSocialAuthAttempt: () => void;
  recoveryStatus: RecoveryStatus;
  recoveryError?: string;
  requestPasswordRecovery: (email: string) => Promise<{ ok: boolean; message?: string }>;
  verifyPasswordRecoveryCode: (email: string, code: string) => Promise<{ ok: boolean; message?: string }>;
  updateRecoveredPassword: (password: string) => Promise<{ ok: boolean; message?: string }>;
  clearRecoverySession: () => Promise<{ ok: boolean; message?: string }>;
  signInWithProvider: (provider: SocialAuthProvider) => Promise<{ ok: boolean; message?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (input: RegisterUserInput) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<{ ok: boolean; message?: string }>;
  updateSettings: (settings: Partial<UserSettings> & Partial<Pick<UserProfile, 'username' | 'name' | 'organization' | 'city' | 'state' | 'country' | 'bio' | 'website' | 'avatarUrl'>>) => Promise<{ ok: boolean; message?: string }>;
  isUsernameAvailable: (username: string, currentUserId?: string) => Promise<{ ok: boolean; available: boolean; message?: string }>;
  mfaStatus: MfaStatus;
  mfaError?: string;
  mfaMessage?: string;
  mfaFactors: MfaFactor[];
  mfaEnrollment: MfaEnrollment | null;
  mfaRequired: boolean;
  currentAssuranceLevel: AssuranceLevel;
  nextAssuranceLevel: AssuranceLevel;
  refreshMfaStatus: () => Promise<{ ok: boolean; message?: string }>;
  enrollTotp: () => Promise<{ ok: boolean; message?: string }>;
  verifyTotpEnrollment: (code: string) => Promise<{ ok: boolean; message?: string }>;
  cancelTotpEnrollment: () => Promise<{ ok: boolean; message?: string }>;
  verifyMfaChallenge: (code: string) => Promise<{ ok: boolean; message?: string }>;
  disableTotp: (code?: string) => Promise<{ ok: boolean; message?: string }>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readLocalSettings(userId: string): Partial<UserSettings> {
  try {
    const raw = window.localStorage.getItem(SUPABASE_LOCAL_SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<UserSettings>>;
    return parsed[userId] ?? {};
  } catch {
    return {};
  }
}

function saveLocalSettings(userId: string, settings: UserSettings) {
  try {
    const raw = window.localStorage.getItem(SUPABASE_LOCAL_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, Partial<UserSettings>> : {};
    parsed[userId] = settings;
    window.localStorage.setItem(SUPABASE_LOCAL_SETTINGS_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

function networkMessage(message?: string) {
  if (!message) return 'Não foi possível conectar ao serviço de autenticação.';
  if (/invalid login|invalid credentials/i.test(message)) return 'E-mail ou senha inválidos.';
  if (/email not confirmed|confirm/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/failed to fetch|network/i.test(message)) return 'Falha de rede ao conectar ao Supabase.';
  return 'Não foi possível concluir a autenticação.';
}

function recoveryMessage(message?: string, operation: 'request' | 'verify' | 'update' | 'clear' = 'verify') {
  if (/rate|too many|security purposes|429/i.test(message ?? '')) return 'Muitas solicitações foram realizadas. Aguarde antes de tentar novamente.';
  if (/fetch|network|unavailable|timeout|connection/i.test(message ?? '')) return 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.';
  if (operation === 'verify') return 'Código inválido ou expirado. Verifique o código ou solicite um novo.';
  if (operation === 'update') return 'Não foi possível alterar a senha. Solicite um novo código e tente novamente.';
  if (operation === 'clear') return 'A senha foi alterada, mas não foi possível encerrar a sessão temporária. Feche esta janela antes de continuar.';
  return 'Não foi possível enviar o código. Tente novamente mais tarde.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(supabaseConfig.isConfigured ? 'loading-session' : 'supabase-unconfigured');
  const [authMessage, setAuthMessage] = useState<string | undefined>(supabaseConfig.isConfigured ? undefined : 'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  const [socialAuthProvider, setSocialAuthProvider] = useState<SocialAuthProvider | null>(null);
  const [socialAuthError, setSocialAuthError] = useState<string | undefined>(undefined);
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>('idle');
  const [recoveryError, setRecoveryError] = useState<string | undefined>(undefined);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>('unavailable');
  const [mfaError, setMfaError] = useState<string | undefined>(undefined);
  const [mfaMessage, setMfaMessage] = useState<string | undefined>(undefined);
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [currentAssuranceLevel, setCurrentAssuranceLevel] = useState<AssuranceLevel>(null);
  const [nextAssuranceLevel, setNextAssuranceLevel] = useState<AssuranceLevel>(null);
  const mfaBusy = useRef(false);
  const recoverySession = useRef(false);
  const socialAttemptInFlight = useRef(false);
  const socialAttemptTimeout = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const oauthCallbackInProgress = useRef(false);
  const pageWasHiddenDuringSocialAttempt = useRef(false);
  const loading = authStatus === 'loading-session';
  const initStarted = useRef(false);

  const cancelSocialAttemptTimeout = useCallback(() => {
    if (socialAttemptTimeout.current !== null) {
      window.clearTimeout(socialAttemptTimeout.current);
      socialAttemptTimeout.current = null;
    }
  }, []);

  const resetSocialAuthAttempt = useCallback(() => {
    cancelSocialAttemptTimeout();
    socialAttemptInFlight.current = false;
    pageWasHiddenDuringSocialAttempt.current = false;
    setSocialAuthProvider(null);
  }, [cancelSocialAttemptTimeout]);

  const repositories = useMemo(() => {
    if (!supabaseClient) return null;
    return { users: new SupabaseUserRepository(supabaseClient), profiles: new ProfileRepository(supabaseClient), mfa: new MfaRepository(supabaseClient) };
  }, []);

  const loadProfile = async (nextSession: Session | null, mounted: () => boolean): Promise<{ ok: boolean; message?: string }> => {
    if (!repositories) return { ok: false, message: 'Supabase não configurado.' };
    setSession(nextSession);
    if (!nextSession?.user) {
      setUser(null);
      setAuthStatus('anonymous');
      setAuthMessage(undefined);
      return { ok: true };
    }
    const expiresAt = nextSession.expires_at ? nextSession.expires_at * 1000 : undefined;
    if (expiresAt && expiresAt < Date.now()) {
      setUser(null);
      setAuthStatus('session-expired');
      setAuthMessage('A sessão expirou. Entre novamente.');
      return { ok: false, message: 'A sessão expirou. Entre novamente.' };
    }
    const result = await repositories.profiles.getByAuthUserId(nextSession.user.id, nextSession.user.email ?? '');
    if (!mounted()) return { ok: false, message: 'Operação cancelada.' };
    if (result.ok) {
      setUser({ ...result.profile, settings: { ...result.profile.settings, ...readLocalSettings(result.profile.id) } });
      setAuthStatus('authenticated');
      setAuthMessage(undefined);
      return { ok: true };
    } else {
      setUser(null);
      setAuthStatus(result.reason === 'missing' ? 'profile-missing' : 'network-error');
      setAuthMessage(result.message);
      return { ok: false, message: result.message };
    }
  };

  const evaluateSession = async (nextSession: Session | null, mounted: () => boolean) => {
    setSession(nextSession);
    if (!nextSession) { setMfaStatus('unavailable'); setMfaFactors([]); return loadProfile(null, mounted); }
    setMfaStatus('loading'); setMfaError(undefined);
    const [assurance, listed] = await Promise.all([repositories!.mfa.getAssuranceLevel(), repositories!.mfa.listMfaFactors()]);
    if (!mounted()) return { ok: false, message: 'Operação cancelada.' };
    if (assurance.error || listed.error) {
      const message = 'Não foi possível verificar a segurança da sessão. Tente novamente ou saia.';
      setUser(null); setAuthStatus('mfa-required'); setMfaStatus('error'); setMfaError(message);
      return { ok: false, message };
    }
    setMfaFactors(listed.factors); setCurrentAssuranceLevel(assurance.currentLevel); setNextAssuranceLevel(assurance.nextLevel);
    const verified = selectVerifiedFactor(listed.factors);
    if (verified && assurance.currentLevel === 'aal1' && assurance.nextLevel === 'aal2') {
      setUser(null); setAuthStatus('mfa-required'); setMfaStatus('challenge-required');
      return { ok: true, mfaRequired: true };
    }
    setMfaStatus(verified ? 'enabled' : 'disabled');
    return loadProfile(nextSession, mounted);
  };

  useEffect(() => {
    if (!repositories || initStarted.current) return undefined;
    initStarted.current = true;
    let active = true;
    const mounted = () => active;
    const finishOAuthCallback = async () => {
      if (!isOAuthCallbackUrl()) return false;
      oauthCallbackInProgress.current = true;
      cancelSocialAttemptTimeout();
      const { code, error: callbackError } = readOAuthCallbackParams();
      if (callbackError || !code) {
        const message = translateOAuthError(callbackError ?? 'cancelled');
        setSocialAuthError(message);
        setAuthStatus('anonymous');
        setAuthMessage(message);
        oauthCallbackInProgress.current = false;
        resetSocialAuthAttempt();
        cleanOAuthCallbackUrl('#/login');
        return true;
      }
      setAuthStatus('loading-session');
      const { data, error } = await repositories.users.handleOAuthCallback(code);
      if (error) {
        const message = translateOAuthError(error.message);
        setSocialAuthError(message);
        setAuthStatus('network-error');
        setAuthMessage(message);
        oauthCallbackInProgress.current = false;
        resetSocialAuthAttempt();
        cleanOAuthCallbackUrl('#/login');
        return true;
      }
      const target = consumeOAuthReturnTo();
      cleanOAuthCallbackUrl('#/profile');
      const result = await evaluateSession(data.session, mounted);
      if ('mfaRequired' in result && result.mfaRequired) setMfaReturnTo(target);
      oauthCallbackInProgress.current = false;
      resetSocialAuthAttempt();
      if (!result.ok) {
        cleanOAuthCallbackUrl('#/profile');
        return true;
      }
      cleanOAuthCallbackUrl(target);
      return true;
    };
    finishOAuthCallback().then((handled) => {
      if (handled || !mounted()) return;
      repositories.users.getSession().then(({ data, error }: { data: { session: Session | null }; error: { message: string } | null }) => {
      if (!mounted()) return;
      if (error) {
        setAuthStatus('network-error');
        setAuthMessage(networkMessage(error.message));
        return;
      }
      if (data.session && hasRecoveryMarker()) {
        recoverySession.current = true;
        setSession(data.session);
        setUser(null);
        setAuthStatus('anonymous');
        setAuthMessage(undefined);
        setRecoveryStatus('code-verified');
        setRecoveryError(undefined);
        return;
      }
      if (!data.session && hasRecoveryMarker()) setRecoveryMarker(false);
      void evaluateSession(data.session, mounted);
      });
    });
    const subscription = repositories.users.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        resetSocialAuthAttempt();
        recoverySession.current = false;
        clearPasswordRecoveryFlowState();
        setSession(null);
        setUser(null);
        setAuthStatus('anonymous');
        return;
      }
      if (event === 'PASSWORD_RECOVERY' || recoverySession.current || hasRecoveryMarker()) {
        recoverySession.current = true;
        setSession(nextSession);
        setUser(null);
        setAuthStatus('anonymous');
        if (nextSession && hasRecoveryMarker()) setRecoveryStatus('code-verified');
        return;
      }
      if (event === 'SIGNED_IN') resetSocialAuthAttempt();
      void evaluateSession(nextSession, mounted);
    });
    return () => {
      active = false;
      cancelSocialAttemptTimeout();
      subscription.unsubscribe();
      initStarted.current = false;
    };
  }, [cancelSocialAttemptTimeout, repositories, resetSocialAuthAttempt]);

  useEffect(() => {
    const resetIfReturnedWithoutCallback = () => {
      if (!socialAttemptInFlight.current || oauthCallbackInProgress.current || isOAuthCallbackUrl()) return;
      resetSocialAuthAttempt();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || pageWasHiddenDuringSocialAttempt.current) resetIfReturnedWithoutCallback();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (socialAttemptInFlight.current) pageWasHiddenDuringSocialAttempt.current = true;
        return;
      }
      if (pageWasHiddenDuringSocialAttempt.current) resetIfReturnedWithoutCallback();
    };
    const handleFocus = () => {
      if (pageWasHiddenDuringSocialAttempt.current) resetIfReturnedWithoutCallback();
    };
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [resetSocialAuthAttempt]);

  const login: AuthContextValue['login'] = async (email, password) => {
    if (!repositories) return { ok: false, message: 'Supabase não configurado.' };
    setAuthStatus('loading-session');
    const { data, error } = await repositories.users.signInWithPassword(email, password);
    if (error) {
      setUser(null);
      setSession(null);
      const message = networkMessage(error.message);
      setAuthStatus(message.includes('Confirme') ? 'email-confirmation-pending' : 'network-error');
      setAuthMessage(message);
      return { ok: false, message };
    }
    return evaluateSession(data.session, () => true);
  };

  const register: AuthContextValue['register'] = async (input) => {
    if (!repositories) return { ok: false, message: 'Supabase não configurado.' };
    if (input.password !== input.confirmPassword) return { ok: false, message: 'A confirmação de senha não confere.' };
    if (!input.acceptedTerms) return { ok: false, message: 'É necessário aceitar os termos para criar a conta.' };
    const { data, error } = await repositories.users.signUp(input);
    if (error) return { ok: false, message: networkMessage(error.message) };
    if (!data.session) {
      setAuthStatus('email-confirmation-pending');
      setAuthMessage('Cadastro recebido. Confirme seu e-mail antes de entrar.');
      return { ok: true, message: 'Cadastro recebido. Confirme seu e-mail antes de entrar.' };
    }
    return evaluateSession(data.session, () => true);
  };

  const signInWithProvider: AuthContextValue['signInWithProvider'] = async (provider) => {
    if (!repositories) return { ok: false, message: 'Supabase não configurado.' };
    if (socialAttemptInFlight.current) return { ok: false, message: 'Já existe uma tentativa de login social em andamento.' };
    socialAttemptInFlight.current = true;
    pageWasHiddenDuringSocialAttempt.current = false;
    setSocialAuthProvider(provider);
    setSocialAuthError(undefined);
    cancelSocialAttemptTimeout();
    socialAttemptTimeout.current = window.setTimeout(() => {
      if (!oauthCallbackInProgress.current && !isOAuthCallbackUrl()) resetSocialAuthAttempt();
    }, 15_000);
    const { error } = await repositories.users.signInWithOAuth(provider);
    if (error) {
      resetSocialAuthAttempt();
      const message = translateOAuthError(error.message);
      setSocialAuthError(message);
      return { ok: false, message };
    }
    return { ok: true };
  };

  const logout: AuthContextValue['logout'] = async () => {
    if (!repositories) return { ok: false, message: 'Supabase não configurado.' };
    const { error } = await repositories.users.signOut();
    if (error) {
      const message = 'Não foi possível sair. Tente novamente.';
      setAuthMessage(message);
      return { ok: false, message };
    }
    setUser(null);
    setSession(null);
    setAuthStatus('anonymous');
    setAuthMessage(undefined); setMfaEnrollment(null); setMfaFactors([]); setMfaStatus('unavailable'); clearMfaReturnTo();
    return { ok: true };
  };

  const requestPasswordRecovery: AuthContextValue['requestPasswordRecovery'] = async (email) => {
    if (!repositories) return { ok: false, message: 'Supabase não configurado.' };
    setRecoveryStatus('requesting-code'); setRecoveryError(undefined);
    try {
      const { error } = await repositories.users.requestPasswordRecovery(email);
      if (error) { const message = recoveryMessage(error.message, 'request'); setRecoveryStatus('error'); setRecoveryError(message); return { ok: false, message }; }
      setRecoveryStatus('code-sent');
      return { ok: true, message: 'Caso exista uma conta associada a este e-mail, enviaremos um código de recuperação.' };
    } catch { const message = recoveryMessage('network', 'request'); setRecoveryStatus('error'); setRecoveryError(message); return { ok: false, message }; }
  };

  const verifyPasswordRecoveryCode: AuthContextValue['verifyPasswordRecoveryCode'] = async (email, code) => {
    if (!repositories) return { ok: false, message: 'Supabase não configurado.' };
    setRecoveryStatus('verifying-code'); setRecoveryError(undefined);
    recoverySession.current = true;
    const { data, error } = await repositories.users.verifyPasswordRecoveryCode(email, code).catch(() => ({ data: { session: null }, error: { message: 'network' } }));
    if (error || !data.session) { recoverySession.current = false; const message = recoveryMessage(error?.message); setRecoveryStatus('error'); setRecoveryError(message); return { ok: false, message }; }
    setRecoveryMarker(true);
    recoverySession.current = true;
    setSession(data.session); setRecoveryStatus('code-verified');
    return { ok: true };
  };

  const clearRecoverySession: AuthContextValue['clearRecoverySession'] = async () => {
    if (!repositories) return { ok: false, message: 'Supabase não configurado.' };
    if (!recoverySession.current && !hasRecoveryMarker()) { setRecoveryStatus('idle'); setRecoveryError(undefined); return { ok: true }; }
    recoverySession.current = true;
    const { error } = await repositories.users.clearRecoverySession().catch(() => ({ error: { message: 'network' } }));
    if (error) { const message = recoveryMessage(error.message, 'clear'); setRecoveryError(message); return { ok: false, message }; }
    recoverySession.current = false; clearPasswordRecoveryFlowState(); setSession(null); setUser(null); setAuthStatus('anonymous'); setRecoveryStatus('idle'); setRecoveryError(undefined);
    return { ok: true };
  };

  const updateRecoveredPassword: AuthContextValue['updateRecoveredPassword'] = async (password) => {
    if (!repositories || (!recoverySession.current && !hasRecoveryMarker())) return { ok: false, message: 'A verificação expirou. Solicite um novo código.' };
    recoverySession.current = true;
    setRecoveryStatus('updating-password'); setRecoveryError(undefined);
    const { error } = await repositories.users.updateRecoveredPassword(password).catch(() => ({ error: { message: 'network' } }));
    if (error) { const message = recoveryMessage(error.message, 'update'); setRecoveryStatus('error'); setRecoveryError(message); return { ok: false, message }; }
    const cleared = await repositories.users.clearRecoverySession().catch(() => ({ error: { message: 'network' } }));
    if (cleared.error) { const message = recoveryMessage(cleared.error.message, 'clear'); setRecoveryStatus('error'); setRecoveryError(message); return { ok: false, message }; }
    recoverySession.current = false; clearPasswordRecoveryFlowState(); setSession(null); setUser(null); setAuthStatus('anonymous'); setRecoveryStatus('success');
    return { ok: true, message: 'Senha alterada com sucesso.' };
  };

  const updateSettings: AuthContextValue['updateSettings'] = async (settings) => {
    if (!user || !repositories) return { ok: false, message: 'Usuário não autenticado.' };
    const localSettings: Partial<UserSettings> = {};
    if (typeof settings.emailNotifications === 'boolean') localSettings.emailNotifications = settings.emailNotifications;
    if (typeof settings.publicProfile === 'boolean') localSettings.publicProfile = settings.publicProfile;
    if (typeof settings.weeklyDigest === 'boolean') localSettings.weeklyDigest = settings.weeklyDigest;
    const editable = { username: settings.username, name: settings.name, organization: settings.organization, city: settings.city, state: settings.state, country: settings.country, bio: settings.bio, website: settings.website, avatarUrl: settings.avatarUrl };
    const hasRemote = Object.values(editable).some((value) => typeof value === 'string');
    if (hasRemote) {
      const result = await repositories.profiles.updateEditableFields(user.id, editable, user.email);
      if (!result.ok) return { ok: false, message: result.message };
      const nextSettings = { ...user.settings, ...localSettings };
      if (!saveLocalSettings(user.id, nextSettings)) return { ok: false, message: 'Não foi possível salvar as preferências locais.' };
      setUser({ ...result.profile, settings: nextSettings });
      return { ok: true };
    }
    const nextSettings = { ...user.settings, ...localSettings };
    if (!saveLocalSettings(user.id, nextSettings)) return { ok: false, message: 'Não foi possível salvar as preferências locais.' };
    setUser({ ...user, settings: nextSettings });
    return { ok: true };
  };

  const isUsernameAvailable: AuthContextValue['isUsernameAvailable'] = async (username, currentUserId = user?.id) => {
    if (!repositories) return { ok: false, available: false, message: 'Supabase não configurado.' };
    return repositories.profiles.isUsernameAvailable(username, currentUserId);
  };

  const refreshMfaStatus: AuthContextValue['refreshMfaStatus'] = async () => {
    if (!session) return { ok: false, message: 'Usuário não autenticado.' };
    return evaluateSession(session, () => true);
  };
  const enrollTotp: AuthContextValue['enrollTotp'] = async () => {
    if (mfaBusy.current || !repositories || !session) return { ok: false, message: 'Não foi possível iniciar a configuração.' };
    if (selectVerifiedFactor(mfaFactors)) return { ok: false, message: 'Esta conta já possui autenticação em dois fatores configurada.' };
    mfaBusy.current = true; setMfaStatus('loading'); setMfaError(undefined); setMfaMessage(undefined);
    try {
      for (const factor of mfaFactors.filter((item) => item.status === 'unverified')) await repositories.mfa.unenrollTotp(factor.id);
      const result = await repositories.mfa.enrollTotp();
      if (!result.enrollment) { const message = 'Não foi possível iniciar a configuração. Verifique sua conexão e tente novamente.'; setMfaStatus('error'); setMfaError(message); return { ok: false, message }; }
      setMfaEnrollment(result.enrollment); setMfaStatus('enrollment-pending'); return { ok: true };
    } finally { mfaBusy.current = false; }
  };
  const verifyTotpEnrollment: AuthContextValue['verifyTotpEnrollment'] = async (rawCode) => {
    const code = normalizeTotpCode(rawCode);
    if (mfaBusy.current || !repositories || !mfaEnrollment || code.length !== 6) return { ok: false, message: 'Código inválido ou expirado. Aguarde o próximo código e tente novamente.' };
    mfaBusy.current = true; setMfaStatus('verifying'); setMfaError(undefined);
    try {
      const { error } = await repositories.mfa.challengeAndVerifyTotp(mfaEnrollment.factorId, code);
      if (error) { const message = 'Código inválido ou expirado. Aguarde o próximo código e tente novamente.'; setMfaStatus('enrollment-pending'); setMfaError(message); return { ok: false, message }; }
      setMfaEnrollment(null); setMfaMessage('Autenticação em dois fatores ativada com sucesso.'); await evaluateSession(session, () => true); return { ok: true };
    } finally { mfaBusy.current = false; }
  };
  const cancelTotpEnrollment: AuthContextValue['cancelTotpEnrollment'] = async () => {
    const pending = mfaEnrollment; setMfaEnrollment(null); setMfaError(undefined);
    if (pending && repositories) await repositories.mfa.unenrollTotp(pending.factorId);
    if (session) await evaluateSession(session, () => true);
    return { ok: true };
  };
  const verifyMfaChallenge: AuthContextValue['verifyMfaChallenge'] = async (rawCode) => {
    const code = normalizeTotpCode(rawCode); const factor = selectVerifiedFactor(mfaFactors);
    if (mfaBusy.current || !factor || code.length !== 6) return { ok: false, message: 'Código inválido ou expirado. Tente novamente.' };
    mfaBusy.current = true; setMfaStatus('verifying'); setMfaError(undefined);
    try {
      const { error } = await repositories!.mfa.challengeAndVerifyTotp(factor.id, code);
      if (error) { const message = 'Código inválido ou expirado. Tente novamente.'; setMfaStatus('challenge-required'); setMfaError(message); return { ok: false, message }; }
      return evaluateSession(session, () => true);
    } finally { mfaBusy.current = false; }
  };
  const disableTotp: AuthContextValue['disableTotp'] = async (rawCode) => {
    const factor = selectVerifiedFactor(mfaFactors); if (!factor || !repositories) return { ok: false, message: 'Fator não encontrado.' };
    if (currentAssuranceLevel !== 'aal2') { const verified = await verifyMfaChallenge(rawCode ?? ''); if (!verified.ok) return verified; }
    const { error } = await repositories.mfa.unenrollTotp(factor.id);
    if (error) return { ok: false, message: 'Não foi possível desativar a autenticação em dois fatores.' };
    setMfaMessage('Autenticação em dois fatores desativada.'); setMfaEnrollment(null); return evaluateSession(session, () => true);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    authStatus,
    authMessage,
    isSupabaseConfigured: supabaseConfig.isConfigured,
    isAuthenticated: authStatus === 'authenticated' && Boolean(user),
    isLoading: loading,
    socialAuthProvider,
    socialAuthError,
    resetSocialAuthAttempt,
    recoveryStatus,
    recoveryError,
    requestPasswordRecovery,
    verifyPasswordRecoveryCode,
    updateRecoveredPassword,
    clearRecoverySession,
    signInWithProvider,
    login,
    register,
    logout,
    updateSettings,
    isUsernameAvailable, mfaStatus, mfaError, mfaMessage, mfaFactors, mfaEnrollment, mfaRequired: authStatus === 'mfa-required', currentAssuranceLevel, nextAssuranceLevel, refreshMfaStatus, enrollTotp, verifyTotpEnrollment, cancelTotpEnrollment, verifyMfaChallenge, disableTotp,
  }), [authMessage, authStatus, loading, resetSocialAuthAttempt, session, socialAuthError, socialAuthProvider, user, mfaStatus, mfaError, mfaMessage, mfaFactors, mfaEnrollment, currentAssuranceLevel, nextAssuranceLevel]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
