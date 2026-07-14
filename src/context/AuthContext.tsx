import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultAchievements, defaultStats, mockUsers } from '../data/mockUsers';
import type { MockUser, RegisterUserInput, UserProfile, UserSettings } from '../types/user';

export interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (input: RegisterUserInput) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const SESSION_KEY = 'banco-de-solucoes.auth.session';
const USERS_KEY = 'banco-de-solucoes.auth.users';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function withoutPassword(user: MockUser): UserProfile {
  const { password: _password, ...profile } = user;
  return profile;
}

function readStoredUsers() {
  try {
    const rawValue = window.localStorage.getItem(USERS_KEY);
    if (!rawValue) return [];
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is MockUser => Boolean(item) && typeof item === 'object' && 'email' in item && 'password' in item);
  } catch {
    return [];
  }
}

function writeStoredUsers(users: MockUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession() {
  try {
    const rawValue = window.localStorage.getItem(SESSION_KEY);
    if (!rawValue) return null;
    const parsed: unknown = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || !('email' in parsed)) return null;
    return String(parsed.email);
  } catch {
    return null;
  }
}

function findUserByEmail(email: string, users: MockUser[]) {
  const normalizedEmail = email.trim().toLowerCase();
  return users.find((item) => item.email.toLowerCase() === normalizedEmail);
}

function findUserByUsername(username: string, users: MockUser[]) {
  const normalizedUsername = username.trim().toLowerCase();
  return users.find((item) => item.username.toLowerCase() === normalizedUsername);
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeUsers(defaultUsers: MockUser[], storedUsers: MockUser[]) {
  const usersByEmail = new Map(defaultUsers.map((user) => [user.email.toLowerCase(), user]));
  storedUsers.forEach((storedUser) => usersByEmail.set(storedUser.email.toLowerCase(), storedUser));
  return Array.from(usersByEmail.values());
}

function buildRegisteredUser(input: RegisterUserInput): MockUser {
  const name = input.name.trim();
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BS';

  return {
    id: `user-${createId()}`,
    name,
    username: input.username.trim().toLowerCase(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: 'Colaborador(a)',
    organization: input.organization?.trim() || 'Comunidade Banco de Soluções',
    city: input.city?.trim() || 'Brasil',
    state: input.state?.trim() || 'BR',
    country: input.country?.trim() || 'Brasil',
    bio: input.bio?.trim() || 'Novo perfil preparado para contribuir com problemas, soluções e evidências.',
    avatarUrl: input.avatarUrl?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0f172a&color=fff`,
    createdAt: new Date().toISOString().slice(0, 10),
    stats: {
      ...defaultStats,
      problemsSubmitted: 0,
      solutionsSubmitted: 0,
      favoritesSaved: 0,
      contributionsReviewed: 0,
      impactScore: 10,
    },
    achievements: defaultAchievements.slice(0, 1),
    settings: {
      emailNotifications: true,
      publicProfile: true,
      weeklyDigest: false,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<MockUser[]>(() => mergeUsers(mockUsers, readStoredUsers()));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const email = readSession();
    if (email) {
      const savedUser = findUserByEmail(email, users);
      if (savedUser) setUser(withoutPassword(savedUser));
    }
    setIsLoading(false);
  }, [users]);

  const login: AuthContextValue['login'] = async (email, password) => {
    const foundUser = findUserByEmail(email, users);
    if (!foundUser || foundUser.password !== password) {
      return { ok: false, message: 'E-mail ou senha inválidos.' };
    }

    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ email: foundUser.email, signedInAt: new Date().toISOString() }));
    setUser(withoutPassword(foundUser));
    return { ok: true };
  };

  const register: AuthContextValue['register'] = async (input) => {
    if (findUserByEmail(input.email, users)) {
      return { ok: false, message: 'Este e-mail já está cadastrado.' };
    }

    if (findUserByUsername(input.username, users)) {
      return { ok: false, message: 'Este nome de usuário já está cadastrado.' };
    }

    if (input.password !== input.confirmPassword) {
      return { ok: false, message: 'A confirmação de senha não confere.' };
    }

    if (!input.acceptedTerms) {
      return { ok: false, message: 'É necessário aceitar os termos para criar a conta.' };
    }

    const nextUser = buildRegisteredUser(input);
    const nextUsers = [...users, nextUser];
    writeStoredUsers(nextUsers);
    setUsers(nextUsers);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ email: nextUser.email, signedInAt: new Date().toISOString() }));
    setUser(withoutPassword(nextUser));
    return { ok: true };
  };

  const logout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const updateSettings = (settings: Partial<UserSettings>) => {
    if (!user) return;
    const nextUser = { ...user, settings: { ...user.settings, ...settings } };
    setUser(nextUser);
    setUsers((current) => {
      const nextUsers = current.map((item) => item.id === nextUser.id ? { ...item, settings: nextUser.settings } : item);
      writeStoredUsers(nextUsers);
      return nextUsers;
    });
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
    updateSettings,
  }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
