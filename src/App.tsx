import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { ProblemDetails, SolutionDetails } from './pages/Details';
import { ExploreProblems } from './pages/ExploreProblems';
import { ExploreSolutions } from './pages/ExploreSolutions';
import { ProblemForm, SolutionForm } from './pages/Forms';
import { Home } from './pages/Home';

const pageToHashPath: Record<string, string> = {
  home: '/',
  problemas: '/problems',
  solucoes: '/solutions',
  'novo-problema': '/problems/new',
  'nova-solucao': '/solutions/new',
  sobre: '/about',
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
  return 'home';
}

function hashFromPage(page: string) {
  if (page.startsWith('problema:')) return `#/problems/${page.replace('problema:', '')}`;
  if (page.startsWith('solucao:')) return `#/solutions/${page.replace('solucao:', '')}`;
  return `#${pageToHashPath[page] ?? '/'}`;
}

export function App() {
  const [page, setPageState] = useState(() => pageFromHash(window.location.hash));
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

  return (
    <Layout currentPage={kind} onNavigate={setPage}>
      {page === 'home' && <Home onNavigate={setPage} />}
      {page === 'problemas' && <ExploreProblems onNavigate={setPage} onOpen={(problemId) => setPage(`problema:${problemId}`)} />}
      {page === 'solucoes' && <ExploreSolutions onNavigate={setPage} onOpen={(solutionId) => setPage(`solucao:${solutionId}`)} />}
      {kind === 'problema' && <ProblemDetails id={id} onNavigate={setPage} />}
      {kind === 'solucao' && <SolutionDetails id={id} onNavigate={setPage} />}
      {page === 'novo-problema' && <ProblemForm />}
      {page === 'nova-solucao' && <SolutionForm />}
      {page === 'sobre' && <About />}
    </Layout>
  );
}
