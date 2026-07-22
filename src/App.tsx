import { useEffect, useState } from 'react';
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

const pageToHashPath: Record<string, string> = {
  home: '/',
  problemas: '/problems',
  solucoes: '/solutions',
  'novo-problema': '/problems/new',
  'nova-solucao': '/solutions/new',
  sobre: '/about',
  login: '/login',
  register: '/register',
  'password-recovery': '/password-recovery',
  profile: '/profile',
  contributions: '/contributions',
  favorites: '/favorites',
  diagnostics: '/diagnostics',
  account: '/account',
  'mfa-challenge': '/mfa-challenge',
  admin: '/admin',
  'admin-system': '/admin/system',
  'admin-users': '/admin/users',
  'admin-problems': '/admin/problems',
  'admin-solutions': '/admin/solutions',
  'admin-comments': '/admin/comments',
  'admin-reports': '/admin/reports',
  'admin-audit': '/admin/audit',
  'admin-contributions': '/admin/contributions',
  notifications: '/notificacoes',
  mapa: '/mapa',
};

function normalizeHash(hash: string) {
  return hash.replace(/^#/, '') || '/';
}

function pageFromHash(hash: string) {
  const path = normalizeHash(hash).split('?')[0];

  if (path === '/problems') return 'problemas';
  if (path === '/problems/new') return 'novo-problema';
  if (path.startsWith('/problems/')) return `problema:${path.replace('/problems/', '')}`;
  if (path === '/solutions') return 'solucoes';
  if (path === '/solutions/new') return 'nova-solucao';
  if (path.startsWith('/solutions/')) return `solucao:${path.replace('/solutions/', '')}`;
  if (path === '/about') return 'sobre';
  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/password-recovery') return 'password-recovery';
  if (path === '/profile') return 'profile';
  if (path === '/account') return 'account';
  if (path === '/mfa-challenge') return 'mfa-challenge';
  if (path === '/admin/system') return 'admin-system';
  if (path === '/admin/users') return 'admin-users';
  if (path === '/admin/problems') return 'admin-problems';
  if (path === '/admin/solutions') return 'admin-solutions';
  if (path === '/admin/comments') return 'admin-comments';
  if (path === '/admin/reports') return 'admin-reports';
  if (path === '/admin/audit') return 'admin-audit';
  if (path === '/admin/contributions') return 'admin-contributions';
  if (path === '/admin') return 'admin';
  if (path === '/notificacoes') return 'notifications';
  if (path === '/mapa') return 'mapa';
  if (path === '/contributions') return 'contributions';
  if (path === '/favorites') return 'favorites';
  if (path === '/diagnostics') return 'diagnostics';
  if (path.startsWith('/contributions/')) return `contribution:${path.replace('/contributions/', '')}`;
  return 'home';
}

function hashFromPage(page: string) {
  if (page.startsWith('problema:')) return `#/problems/${page.replace('problema:', '')}`;
  if (page.startsWith('solucao:')) return `#/solutions/${page.replace('solucao:', '')}`;
  if (page.startsWith('contribution:')) return `#/contributions/${page.replace('contribution:', '')}`;
  return `#${pageToHashPath[page] ?? '/'}`;
}

export function App() {
  const { isAuthenticated, isLoading, user, mfaRequired } = useAuth();
  const permissions = usePermissions(user);
  const [page, setPageState] = useState(() => isPasswordRecoveryCallbackUrl() ? 'password-recovery' : pageFromHash(window.location.hash));
  const [kind, id] = page.split(':');
  const setPage = (nextPage: string) => {
    const nextHash = hashFromPage(nextPage);

    if (window.location.hash === nextHash) {
      setPageState(nextPage);
      return;
    }

    window.location.hash = nextHash;
  };

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
    if (!isLoading && (page === 'profile' || page === 'account' || page === 'contributions' || page === 'favorites' || page === 'notifications' || kind === 'contribution') && !isAuthenticated) {
      setMfaReturnTo(window.location.hash);
      setPage('login');
    }
  }, [isAuthenticated, isLoading, mfaRequired, page]);

  const adminPages = new Set(['admin', 'admin-system', 'admin-users', 'admin-problems', 'admin-solutions', 'admin-comments', 'admin-reports', 'admin-audit', 'admin-contributions']);
  const adminPage = adminPages.has(page);
  const adminContent = page === 'admin' ? <AdminDashboard onNavigate={setPage} />
    : page === 'admin-system' ? <AdminSystem />
      : page === 'admin-users' ? <AdminPanel initialTab="roles" />
        : page === 'admin-comments' || page === 'admin-reports' ? <AdminPanel initialTab="comments" />
          : page === 'admin-audit' ? <AdminPanel initialTab="audit" />
            : page === 'admin-contributions' ? <AdminPanel initialTab="contributions" />
      : <AdminSectionPlaceholder title={({ 'admin-users': 'Usuários', 'admin-problems': 'Problemas', 'admin-solutions': 'Soluções', 'admin-comments': 'Comentários', 'admin-reports': 'Denúncias', 'admin-audit': 'Auditoria' } as Record<string, string>)[page]} onBack={() => setPage('admin')} />;

  return (
    <Layout currentPage={kind} onNavigate={setPage}>
      {page === 'home' && <Home onNavigate={setPage} />}
      {page === 'problemas' && <ExploreProblems onNavigate={setPage} onOpen={(problemId) => setPage(`problema:${problemId}`)} />}
      {page === 'mapa' && <PublicMap onOpen={(problemId) => setPage(`problema:${problemId}`)} />}
      {page === 'solucoes' && <ExploreSolutions onNavigate={setPage} onOpen={(solutionId) => setPage(`solucao:${solutionId}`)} />}
      {kind === 'problema' && <ProblemDetails id={id} onNavigate={setPage} />}
      {kind === 'solucao' && <SolutionDetails id={id} onNavigate={setPage} />}
      {page === 'novo-problema' && <ProblemForm />}
      {page === 'nova-solucao' && <SolutionForm />}
      {page === 'sobre' && <About />}
      {page === 'login' && <Login onNavigate={setPage} />}
      {page === 'register' && <Register onNavigate={setPage} />}
      {page === 'mfa-challenge' && mfaRequired && <MfaChallenge onNavigate={setPage} />}
      {page === 'password-recovery' && <PasswordRecovery onNavigate={setPage} />}
      {page === 'profile' && isAuthenticated && <Profile onNavigate={setPage} />}
      {page === 'account' && isAuthenticated && <Account onNavigate={setPage} />}
      {adminPage && <AdminRoute isAuthenticated={isAuthenticated} isLoading={isLoading} isAdmin={permissions.canAccessAdmin} onLoginRequired={() => { setMfaReturnTo(window.location.hash); setPage('login'); }}>{adminContent}</AdminRoute>}
      {page === 'contributions' && isAuthenticated && <ContributionsList onNavigate={setPage} />}
      {page === 'favorites' && isAuthenticated && <Favorites onNavigate={setPage} />}
      {page === 'notifications' && isAuthenticated && <Notifications />}
      {page === 'diagnostics' && <SupabaseStatus />}
      {kind === 'contribution' && isAuthenticated && <ContributionDetails id={id} />}
    </Layout>
  );
}
