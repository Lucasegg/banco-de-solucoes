import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from '../integrations/supabase/client';
import { supabaseConfig } from '../integrations/supabase/config';
import { ProfileRepository } from '../repositories/profiles';
import { SupabaseUserRepository } from '../repositories/users/SupabaseUserRepository';
import type { RegisterUserInput, UserProfile, UserSettings } from '../types/user';

export type AuthStatus = 'supabase-unconfigured' | 'loading-session' | 'anonymous' | 'authenticated' | 'profile-missing' | 'email-confirmation-pending' | 'network-error' | 'session-expired';

export interface AuthContextValue {
  user: UserProfile | null;
  session: Session | null;
  authStatus: AuthStatus;
  authMessage?: string;
  isSupabaseConfigured: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (input: RegisterUserInput) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<{ ok: boolean; message?: string }>;
  updateSettings: (settings: Partial<UserSettings> & Partial<Pick<UserProfile, 'username' | 'name' | 'country' | 'bio' | 'avatarUrl'>>) => Promise<{ ok: boolean; message?: string }>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function networkMessage(message?: string) {
  if (!message) return 'Não foi possível conectar ao serviço de autenticação.';
  if (/invalid login|invalid credentials/i.test(message)) return 'E-mail ou senha inválidos.';
  if (/email not confirmed|confirm/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/failed to fetch|network/i.test(message)) return 'Falha de rede ao conectar ao Supabase.';
  return 'Não foi possível concluir a autenticação.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(supabaseConfig.isConfigured ? 'loading-session' : 'supabase-unconfigured');
  const [authMessage, setAuthMessage] = useState<string | undefined>(supabaseConfig.isConfigured ? undefined : 'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  const loading = authStatus === 'loading-session';
  const initStarted = useRef(false);

  const repositories = useMemo(() => {
    if (!supabaseClient) return null;
    return { users: new SupabaseUserRepository(supabaseClient), profiles: new ProfileRepository(supabaseClient) };
  }, []);

  const loadProfile = async (nextSession: Session | null, mounted: () => boolean) => {
    if (!repositories) return;
    setSession(nextSession);
    if (!nextSession?.user) {
      setUser(null);
      setAuthStatus('anonymous');
      setAuthMessage(undefined);
      return;
    }
    const expiresAt = nextSession.expires_at ? nextSession.expires_at * 1000 : undefined;
    if (expiresAt && expiresAt < Date.now()) {
      setUser(null);
      setAuthStatus('session-expired');
      setAuthMessage('A sessão expirou. Entre novamente.');
      return;
    }
    const result = await repositories.profiles.getByAuthUserId(nextSession.user.id, nextSession.user.email ?? '');
    if (!mounted()) return;
    if (result.ok) {
      setUser(result.profile);
      setAuthStatus('authenticated');
      setAuthMessage(undefined);
    } else {
      setUser(null);
      setAuthStatus(result.reason === 'missing' ? 'profile-missing' : 'network-error');
      setAuthMessage(result.message);
    }
  };

  useEffect(() => {
    if (!repositories || initStarted.current) return undefined;
    initStarted.current = true;
    let active = true;
    const mounted = () => active;
    repositories.users.getSession().then(({ data, error }: { data: { session: Session | null }; error: { message: string } | null }) => {
      if (!mounted()) return;
      if (error) {
        setAuthStatus('network-error');
        setAuthMessage(networkMessage(error.message));
        return;
      }
      void loadProfile(data.session, mounted);
    });
    const subscription = repositories.users.onAuthStateChange((_event, nextSession) => {
      void loadProfile(nextSession, mounted);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      initStarted.current = false;
    };
  }, [repositories]);

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
    await loadProfile(data.session, () => true);
    return { ok: true };
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
    await loadProfile(data.session, () => true);
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
    setAuthMessage(undefined);
    return { ok: true };
  };

  const updateSettings: AuthContextValue['updateSettings'] = async (settings) => {
    if (!user || !repositories) return { ok: false, message: 'Usuário não autenticado.' };
    const localSettings: Partial<UserSettings> = {};
    if (typeof settings.emailNotifications === 'boolean') localSettings.emailNotifications = settings.emailNotifications;
    if (typeof settings.publicProfile === 'boolean') localSettings.publicProfile = settings.publicProfile;
    if (typeof settings.weeklyDigest === 'boolean') localSettings.weeklyDigest = settings.weeklyDigest;
    const editable = { username: settings.username, name: settings.name, country: settings.country, bio: settings.bio, avatarUrl: settings.avatarUrl };
    const hasRemote = Object.values(editable).some((value) => typeof value === 'string');
    if (hasRemote) {
      const result = await repositories.profiles.updateEditableFields(user.id, editable, user.email);
      if (!result.ok) return { ok: false, message: result.message };
      setUser({ ...result.profile, settings: { ...user.settings, ...localSettings } });
      return { ok: true };
    }
    setUser({ ...user, settings: { ...user.settings, ...localSettings } });
    return { ok: true };
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    authStatus,
    authMessage,
    isSupabaseConfigured: supabaseConfig.isConfigured,
    isAuthenticated: authStatus === 'authenticated' && Boolean(user),
    isLoading: loading,
    login,
    register,
    logout,
    updateSettings,
  }), [authMessage, authStatus, loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
