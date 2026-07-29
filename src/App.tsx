import { useCallback, useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { ProblemDetails, SolutionDetails } from './pages/Details';
import { ExploreProblems } from './pages/ExploreProblems';
import { ExploreSolutions } from './pages/ExploreSolutions';
import { ProblemForm, SolutionForm } from './pages/Forms';
import { Home } from './pages/Home';
import { Favorites } from './pages/Favorites';
import { Login, Register } from './pages/Auth';
import { Profile } from './pages/Profile';
import { ContributionDetails, ContributionsList } from './pages/Contributions';
import { useAuth } from './hooks/useAuth';
import { usePermissions } from './hooks/usePermissions';
import { AdminDashboard, AdminPanel, AdminRoute, AdminSectionPlaceholder } from './pages/Admin';
import { SupabaseStatus } from './integrations/supabase/SupabaseStatus';
import { Account } from './pages/Account';
import { PasswordRecovery } from './pages/PasswordRecovery';
import { MfaChallenge } from './pages/MfaChallenge';
import { Notifications } from './pages/Notifications';
import { PublicMap } from './pages/PublicMap';
import { ensureMfaReturnTo, setMfaReturnTo } from './repositories/users/mfaReturnTo';
import { isPasswordRecoveryCallbackUrl } from './repositories/users/passwordRecoveryCallback';
import { AdminSystem } from './pages/AdminSystem';
import { AdminUsers } from './pages/AdminUsers';
import { AdminProblems } from './pages/AdminProblems';
import { AdminSolutions } from './pages/AdminSolutions';
import { AuthenticatedRoute } from './components/auth/AuthenticatedRoute';
import { Search } from './pages/Search';
import { TaxonomyProposalQueue } from './components/admin/TaxonomyProposalQueue';
import { Contact } from './pages/Contact';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Lgpd } from './pages/Lgpd';
import { hashFromPage, pageFromHash } from './routing/hashRouter';
import { LegalConsentGate } from './components/legal/LegalConsentGate';

export function App() {
  const { isAuthenticated, isLoading, user, mfaRequired } = useAuth();
  const permissions = usePermissions(user);
  const [page, setPageState] = useState(() => isPasswordRecoveryCallbackUrl() ? 'password-recovery' : pageFromHash(window.location.hash));
  const [kind, id] = page.split(':');
  const setPage = useCallback((nextPage: string) => {
    const nextHash = hashFromPage(nextPage);

    if (window.location.hash === nextHash) {
      setPageState(nextPage);
      return;
    }

    window.location.hash = nextHash;
  }, []);

  useEffect(() => {
    const sync = () => setPageState(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    if (mfaRequired && page !== 'mfa-challenge') {
      ensureMfaReturnTo(window.location.hash);
      setPage('mfa-challenge');
      return;
    }
    if (!mfaRequired && page === 'mfa-challenge' && isAuthenticated) { setPage('profile'); return; }
  }, [isAuthenticated, mfaRequired, page, setPage]);

  const redirectToLogin = useCallback(() => setPage('login'), [setPage]);
  const redirectToRegister = useCallback(() => setPage('register'), [setPage]);

  const adminPages = new Set(['admin', 'admin-system', 'admin-users', 'admin-problems', 'admin-solutions', 'admin-comments', 'admin-reports', 'admin-audit', 'admin-contributions']);
  const adminPage = adminPages.has(page);
  const consentBypass = !isAuthenticated || mfaRequired || ['home', 'contact', 'privacy', 'terms', 'lgpd', 'login', 'register', 'password-recovery', 'mfa-challenge'].includes(page);
  const adminContent = page === 'admin' ? <AdminDashboard onNavigate={setPage} />
    : page === 'admin-system' ? <AdminSystem />
      : page === 'admin-users' ? <AdminUsers onBack={() => setPage('admin')} />
        : page === 'admin-problems' ? <AdminProblems onBack={() => setPage('admin')} />
          : page === 'admin-solutions' ? <AdminSolutions onBack={() => setPage('admin')} />
        : page === 'admin-comments' || page === 'admin-reports' ? <AdminPanel initialTab="comments" />
          : page === 'admin-audit' ? <AdminPanel initialTab="audit" />
            : page === 'admin-contributions' ? <AdminPanel initialTab="contributions" />
      : <AdminSectionPlaceholder title={({ 'admin-users': 'Usuários', 'admin-problems': 'Problemas', 'admin-solutions': 'Soluções', 'admin-comments': 'Comentários', 'admin-reports': 'Denúncias', 'admin-audit': 'Auditoria' } as Record<string, string>)[page]} onBack={() => setPage('admin')} />;

  return (
    <Layout currentPage={kind} onNavigate={setPage}><LegalConsentGate bypass={consentBypass} onLogout={() => setPage('login')}>
      {page === 'home' && <Home onNavigate={setPage} />}
      {page === 'problemas' && <ExploreProblems onNavigate={setPage} onOpen={(problemId) => setPage(`problema:${problemId}`)} />}
      {page === 'mapa' && <PublicMap onOpen={(problemId) => setPage(`problema:${problemId}`)} />}
      {page === 'search' && <Search onOpenProblem={(problemId) => setPage(`problema:${problemId}`)} onOpenSolution={(solutionId) => setPage(`solucao:${solutionId}`)} />}
      {page === 'solucoes' && <ExploreSolutions onNavigate={setPage} onOpen={(solutionId) => setPage(`solucao:${solutionId}`)} />}
      {kind === 'problema' && <ProblemDetails id={id} onNavigate={setPage} />}
      {kind === 'solucao' && <SolutionDetails id={id} onNavigate={setPage} />}
      {page === 'novo-problema' && <AuthenticatedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} onLoginRequired={redirectToLogin} authPrompt={{ description: 'Para registrar um problema, você precisa estar conectado à sua conta.', onRegisterRequired: redirectToRegister, onBack: () => setPage('problemas') }}><ProblemForm /></AuthenticatedRoute>}
      {page === 'nova-solucao' && <AuthenticatedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} onLoginRequired={redirectToLogin} authPrompt={{ description: 'Para cadastrar uma solução, você precisa estar conectado à sua conta.', onRegisterRequired: redirectToRegister, onBack: () => setPage('solucoes') }}><SolutionForm /></AuthenticatedRoute>}
      {page === 'sobre' && <About />}
      {page === 'contact' && <Contact />}
      {page === 'privacy' && <Privacy />}
      {page === 'terms' && <Terms />}
      {page === 'lgpd' && <Lgpd />}
      {page === 'login' && <Login onNavigate={setPage} />}
      {page === 'register' && <Register onNavigate={setPage} />}
      {page === 'mfa-challenge' && mfaRequired && <MfaChallenge onNavigate={setPage} />}
      {page === 'password-recovery' && <PasswordRecovery onNavigate={setPage} />}
      {page === 'profile' && <AuthenticatedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} onLoginRequired={redirectToLogin}><Profile onNavigate={setPage} /></AuthenticatedRoute>}
      {page === 'account' && <AuthenticatedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} onLoginRequired={redirectToLogin}><Account onNavigate={setPage} /></AuthenticatedRoute>}
      {page === 'admin-taxonomy' && <AdminRoute isAuthenticated={isAuthenticated} isLoading={isLoading} isAdmin={permissions.canReviewTaxonomy} onLoginRequired={() => { setMfaReturnTo(window.location.hash); setPage('login'); }}><TaxonomyProposalQueue /></AdminRoute>}
      {adminPage && <AdminRoute isAuthenticated={isAuthenticated} isLoading={isLoading} isAdmin={permissions.canAccessAdmin} onLoginRequired={() => { setMfaReturnTo(window.location.hash); setPage('login'); }}>{adminContent}</AdminRoute>}
      {page === 'contributions' && <AuthenticatedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} onLoginRequired={redirectToLogin}><ContributionsList onNavigate={setPage} /></AuthenticatedRoute>}
      {page === 'favorites' && <AuthenticatedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} onLoginRequired={redirectToLogin}><Favorites onNavigate={setPage} /></AuthenticatedRoute>}
      {page === 'notifications' && <AuthenticatedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} onLoginRequired={redirectToLogin}><Notifications /></AuthenticatedRoute>}
      {page === 'diagnostics' && <SupabaseStatus />}
      {kind === 'contribution' && <AuthenticatedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} onLoginRequired={redirectToLogin}><ContributionDetails id={id} /></AuthenticatedRoute>}
    </LegalConsentGate></Layout>
  );
}
