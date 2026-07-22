import type { ReactNode } from 'react';
import { saveAuthReturnTo } from './authReturnTo';

export function AuthenticatedRoute({ isAuthenticated, isLoading, onLoginRequired, children }: { isAuthenticated: boolean; isLoading: boolean; onLoginRequired: () => void; children: ReactNode }) {
  if (isLoading) return <main className="rounded-3xl border border-line bg-white p-8" aria-busy="true">Verificando sua sessão...</main>;
  if (!isAuthenticated) {
    saveAuthReturnTo();
    onLoginRequired();
    return <main className="rounded-3xl border border-line bg-white p-8">Redirecionando para entrar...</main>;
  }
  return <>{children}</>;
}
