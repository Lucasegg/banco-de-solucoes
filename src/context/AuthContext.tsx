import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from '../integrations/supabase/client';
import { supabaseConfig } from '../integrations/supabase/config';
import { ProfileRepository } from '../repositories/profiles';
import { SupabaseUserRepository } from '../repositories/users/SupabaseUserRepository';
import type { RegisterUserInput, UserProfile, UserSettings } from '../types/user';

const SUPABASE_LOCAL_SETTINGS_KEY = 'banco-de-solucoes.supabase.profile-settings';

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
  updateSettings: (settings: Partial<UserSettings> & Partial<Pick<UserProfile, 'username' | 'name' | 'organization' | 'city' | 'state' | 'country' | 'bio' | 'website'>>) => Promise<{ ok: boolean; message?: string }>;
  isUsernameAvailable: (username: string, currentUserId?: string) => Promise<{ ok: boolean; available: boolean; message?: string }>;
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
    return loadProfile(data.session, () => true);
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
    return loadProfile(data.session, () => true);
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
    const editable = { username: settings.username, name: settings.name, organization: settings.organization, city: settings.city, state: settings.state, country: settings.country, bio: settings.bio, website: settings.website };
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
    isUsernameAvailable,
  }), [authMessage, authStatus, loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
