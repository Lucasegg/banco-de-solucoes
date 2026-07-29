import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';
import { usePermissions } from './hooks/usePermissions';
import { ensureMfaReturnTo, setMfaReturnTo } from './repositories/users/mfaReturnTo';
import { isPasswordRecoveryCallbackUrl } from './repositories/users/passwordRecoveryCallback';
import { AuthenticatedRoute } from './components/auth/AuthenticatedRoute';
import { AdminRoute } from './components/admin/AdminRoute';
import { hashFromPage, pageFromHash } from './routing/hashRouter';
import { LegalConsentGate } from './components/legal/LegalConsentGate';
import { RouteLoadingFallback } from './components/RouteLoadingFallback';

const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const ProblemDetails = lazy(() => import('./pages/Details').then((m) => ({ default: m.ProblemDetails })));
const SolutionDetails = lazy(() => import('./pages/Details').then((m) => ({ default: m.SolutionDetails })));
const ExploreProblems = lazy(() => import('./pages/ExploreProblems').then((m) => ({ default: m.ExploreProblems })));
const ExploreSolutions = lazy(() => import('./pages/ExploreSolutions').then((m) => ({ default: m.ExploreSolutions })));
const ProblemForm = lazy(() => import('./pages/Forms').then((m) => ({ default: m.ProblemForm })));
const SolutionForm = lazy(() => import('./pages/Forms').then((m) => ({ default: m.SolutionForm })));
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Favorites = lazy(() => import('./pages/Favorites').then((m) => ({ default: m.Favorites })));
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const ContributionDetails = lazy(() => import('./pages/Contributions').then((m) => ({ default: m.ContributionDetails })));
const ContributionsList = lazy(() => import('./pages/Contributions').then((m) => ({ default: m.ContributionsList })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminPanel = lazy(() => import('./pages/LegacyAdminPanel').then((m) => ({ default: m.AdminPanel })));
const AdminSectionPlaceholder = lazy(() => import('./pages/AdminSectionPlaceholder').then((m) => ({ default: m.AdminSectionPlaceholder })));
const SupabaseStatus = lazy(() => import('./integrations/supabase/SupabaseStatus').then((m) => ({ default: m.SupabaseStatus })));
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })));
const PasswordRecovery = lazy(() => import('./pages/PasswordRecovery').then((m) => ({ default: m.PasswordRecovery })));
const MfaChallenge = lazy(() => import('./pages/MfaChallenge').then((m) => ({ default: m.MfaChallenge })));
const Notifications = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.Notifications })));
const PublicMap = lazy(() => import('./pages/PublicMap').then((m) => ({ default: m.PublicMap })));
const AdminSystem = lazy(() => import('./pages/AdminSystem').then((m) => ({ default: m.AdminSystem })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminProblems = lazy(() => import('./pages/AdminProblems').then((m) => ({ default: m.AdminProblems })));
const AdminSolutions = lazy(() => import('./pages/AdminSolutions').then((m) => ({ default: m.AdminSolutions })));
const Search = lazy(() => import('./pages/Search').then((m) => ({ default: m.Search })));
const TaxonomyProposalQueue = lazy(() => import('./components/admin/TaxonomyProposalQueue').then((m) => ({ default: m.TaxonomyProposalQueue })));
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })));
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })));
const Lgpd = lazy(() => import('./pages/Lgpd').then((m) => ({ default: m.Lgpd })));

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
    <Layout currentPage={kind} onNavigate={setPage}><LegalConsentGate bypass={consentBypass} onLogout={() => setPage('login')}><Suspense fallback={<RouteLoadingFallback />}>
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
    </Suspense></LegalConsentGate></Layout>
  );
}
