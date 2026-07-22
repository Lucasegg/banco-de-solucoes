import { useEffect, useRef, type ReactNode } from 'react';
import { saveAuthReturnTo } from './authReturnTo';
import { createAuthRedirectGate, type AuthRedirectGate } from './authRedirectGate';

export { createAuthRedirectGate, type AuthRedirectGate } from './authRedirectGate';
export function AuthenticatedRoute({ isAuthenticated, isLoading, onLoginRequired, children }: { isAuthenticated: boolean; isLoading: boolean; onLoginRequired: () => void; children: ReactNode }) {
  const gate = useRef<AuthRedirectGate | null>(null);
  if (!gate.current) gate.current = createAuthRedirectGate();

  useEffect(() => {
    if (isLoading || isAuthenticated) { gate.current!.reset(); return; }
    if (gate.current!.redirected) return;
    gate.current!.redirect();
    saveAuthReturnTo();
    onLoginRequired();
  }, [isAuthenticated, isLoading, onLoginRequired]);

  if (isLoading) return <main className="rounded-3xl border border-line bg-white p-8" aria-busy="true">Verificando sua sessão...</main>;
  if (!isAuthenticated) return <main className="rounded-3xl border border-line bg-white p-8">Redirecionando para entrar...</main>;
  return <>{children}</>;
}
