import { useEffect, useRef, type ReactNode } from 'react';
import { saveAuthReturnTo } from './authReturnTo';
import { createAuthRedirectGate, type AuthRedirectGate } from './authRedirectGate';

export { createAuthRedirectGate, type AuthRedirectGate } from './authRedirectGate';

export interface AuthenticationRequiredPrompt {
  /** Explains the protected action without mounting its content. */
  description: string;
  onRegisterRequired: () => void;
  onBack: () => void;
}

function AuthenticationRequired({ description, onLogin, onRegister, onBack }: AuthenticationRequiredPrompt & { onLogin: () => void; onRegister: () => void }) {
  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-white p-8 text-center shadow-sm" aria-labelledby="authentication-required-title">
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Autenticação necessária</span>
      <h1 id="authentication-required-title" className="mt-5 text-3xl font-semibold tracking-tight">Entre ou crie uma conta para continuar</h1>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-muted">{description}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button autoFocus type="button" onClick={onLogin} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">Entrar</button>
        <button type="button" onClick={onRegister} className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">Criar conta</button>
        <button type="button" onClick={onBack} className="rounded-full px-5 py-3 text-sm font-semibold text-slate-700 underline focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">Voltar</button>
      </div>
    </section>
  );
}

/** Keeps both auth actions on the same safe return-to flow. */
export function createAuthenticationPromptActions(onLoginRequired: () => void, onRegisterRequired: () => void, onBack: () => void) {
  return {
    login: () => { saveAuthReturnTo(undefined, true); onLoginRequired(); },
    register: () => { saveAuthReturnTo(undefined, true); onRegisterRequired(); },
    back: onBack,
  };
}

export function AuthenticatedRoute({ isAuthenticated, isLoading, onLoginRequired, authPrompt, children }: { isAuthenticated: boolean; isLoading: boolean; onLoginRequired: () => void; authPrompt?: AuthenticationRequiredPrompt; children: ReactNode }) {
  const gate = useRef<AuthRedirectGate | null>(null);
  if (!gate.current) gate.current = createAuthRedirectGate();

  useEffect(() => {
    if (isLoading || isAuthenticated || authPrompt) { gate.current!.reset(); return; }
    if (gate.current!.redirected) return;
    gate.current!.redirect();
    saveAuthReturnTo();
    onLoginRequired();
  }, [authPrompt, isAuthenticated, isLoading, onLoginRequired]);

  if (isLoading) return <main className="rounded-3xl border border-line bg-white p-8" aria-busy="true">Verificando sua sessão...</main>;
  if (!isAuthenticated && authPrompt) {
    const actions = createAuthenticationPromptActions(onLoginRequired, authPrompt.onRegisterRequired, authPrompt.onBack);
    return <AuthenticationRequired {...authPrompt} onLogin={actions.login} onRegister={actions.register} onBack={actions.back} />;
  }
  if (!isAuthenticated) return <main className="rounded-3xl border border-line bg-white p-8">Redirecionando para entrar...</main>;
  return <>{children}</>;
}
