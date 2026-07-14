import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { ProblemDetails, SolutionDetails } from './pages/Details';
import { ExploreProblems } from './pages/ExploreProblems';
import { ExploreSolutions } from './pages/ExploreSolutions';
import { ProblemForm, SolutionForm } from './pages/Forms';
import { Home } from './pages/Home';

const pageToPath: Record<string, string> = {
  home: '/',
  problemas: '/problems',
  solucoes: '/solutions',
  'novo-problema': '/problems/new',
  'nova-solucao': '/solutions/new',
  sobre: '/about',
};

function pageFromPath(pathname: string) {
  if (pathname === '/problems') return 'problemas';
  if (pathname === '/problems/new') return 'novo-problema';
  if (pathname.startsWith('/problems/')) return `problema:${pathname.replace('/problems/', '')}`;
  if (pathname === '/solutions') return 'solucoes';
  if (pathname === '/solutions/new') return 'nova-solucao';
  if (pathname.startsWith('/solutions/')) return `solucao:${pathname.replace('/solutions/', '')}`;
  if (pathname === '/about') return 'sobre';
  return 'home';
}

function pathFromPage(page: string) {
  if (page.startsWith('problema:')) return `/problems/${page.replace('problema:', '')}`;
  if (page.startsWith('solucao:')) return `/solutions/${page.replace('solucao:', '')}`;
  return pageToPath[page] ?? '/';
}

export function App() {
  const [page, setPageState] = useState(() => pageFromPath(window.location.pathname));
  const [kind, id] = page.split(':');
  const setPage = (nextPage: string) => {
    setPageState(nextPage);
    window.history.pushState(null, '', pathFromPage(nextPage));
  };

  useEffect(() => {
    const sync = () => setPageState(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return (
    <Layout currentPage={kind} onNavigate={setPage}>
      {page === 'home' && <Home onNavigate={setPage} />}
      {page === 'problemas' && <ExploreProblems onNavigate={setPage} onOpen={(problemId) => setPage(`problema:${problemId}`)} />}
      {page === 'solucoes' && <ExploreSolutions onOpen={(solutionId) => setPage(`solucao:${solutionId}`)} />}
      {kind === 'problema' && <ProblemDetails id={id} onNavigate={setPage} />}
      {kind === 'solucao' && <SolutionDetails id={id} onNavigate={setPage} />}
      {page === 'novo-problema' && <ProblemForm />}
      {page === 'nova-solucao' && <SolutionForm />}
      {page === 'sobre' && <About />}
    </Layout>
  );
}
