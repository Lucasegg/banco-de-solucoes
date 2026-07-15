import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { UserRepository, buildRegisteredUser, withoutPassword } from '../repositories/users';
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

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<MockUser[]>(() => UserRepository.listUsers());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const email = UserRepository.readSessionEmail();
    if (email) {
      const savedUser = UserRepository.findByEmail(email, users);
      if (savedUser) setUser(withoutPassword(savedUser));
    }
    setIsLoading(false);
  }, [users]);

  const login: AuthContextValue['login'] = async (email, password) => {
    const foundUser = UserRepository.findByEmail(email, users);
    if (!foundUser || foundUser.password !== password) {
      return { ok: false, message: 'E-mail ou senha inválidos.' };
    }

    if (!UserRepository.saveSession(foundUser.email)) {
      return { ok: false, message: 'Não foi possível salvar a sessão local.' };
    }

    setUser(withoutPassword(foundUser));
    return { ok: true };
  };

  const register: AuthContextValue['register'] = async (input) => {
    if (UserRepository.findByEmail(input.email, users)) {
      return { ok: false, message: 'Este e-mail já está cadastrado.' };
    }

    if (UserRepository.findByUsername(input.username, users)) {
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
    if (!UserRepository.saveUsersAndSession(nextUsers, nextUser.email)) {
      return { ok: false, message: 'Não foi possível salvar o cadastro local.' };
    }

    setUsers(nextUsers);
    setUser(withoutPassword(nextUser));
    return { ok: true };
  };

  const logout = () => {
    UserRepository.clearSession();
    setUser(null);
  };

  const updateSettings = (settings: Partial<UserSettings>) => {
    if (!user) return;
    const nextUser = { ...user, settings: { ...user.settings, ...settings } };
    setUsers((current) => {
      const nextUsers = UserRepository.updateSettings(current, nextUser.id, nextUser.settings);
      if (!UserRepository.saveUsers(nextUsers)) return current;
      setUser(nextUser);
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
