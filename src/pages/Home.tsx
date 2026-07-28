import { useEffect, useState } from 'react';
import { ArrowRight, Globe2, Sparkles } from 'lucide-react';
import { ProblemCard, SolutionCard } from '../components/Cards';
import { EmptyState } from '../components/EmptyState';
import { ProblemRepository } from '../repositories/problems';
import { SolutionRepository } from '../repositories/solutions';
import type { Problem, Solution } from '../types/domain';
import { useTranslation } from '../i18n/I18nProvider';

export function Home({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { t } = useTranslation();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      if (!ProblemRepository || !SolutionRepository) {
        if (active) { setCatalogUnavailable(true); setLoading(false); }
        return;
      }
      const [problemResult, solutionResult] = await Promise.all([ProblemRepository.list(), SolutionRepository.list()]);
      if (!active) return;
      if (problemResult.ok) setProblems(problemResult.data.slice(0, 6)); else setError(problemResult.message);
      if (solutionResult.ok) setSolutions(solutionResult.data.slice(0, 3)); else setError((current) => current || solutionResult.message);
      setLoading(false);
    }
    void loadCatalog();
    return () => { active = false; };
  }, []);

  return <div className="space-y-14">
    <section className="rounded-[2rem] border border-line bg-white p-8 shadow-soft md:p-14"><div className="max-w-3xl">
      <span className="rounded-full border border-line px-3 py-1 text-sm text-muted">{t('home.eyebrow')}</span>
      <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-7xl">{t('home.title')}</h1>
      <p className="mt-6 text-lg leading-8 text-muted">{t('home.description')}</p>
      <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => onNavigate('problemas')} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">{t('home.exploreProblems')}</button><button onClick={() => onNavigate('solucoes')} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold">{t('home.viewSolutions')} <ArrowRight size={16} /></button></div>
    </div></section>
    <section className="rounded-[2rem] border border-teal-100 bg-teal-50 p-8 md:flex md:items-center md:justify-between"><div><span className="text-sm font-semibold text-teal-800">{t('home.region')}</span><h2 className="mt-2 text-3xl font-semibold">{t('home.regionTitle')}</h2><p className="mt-3 text-teal-950">{t('home.regionDescription')}</p></div><button onClick={() => onNavigate('mapa')} className="mt-6 rounded-full bg-teal-800 px-5 py-3 font-semibold text-white md:mt-0">{t('home.openMap')}</button></section>
    {(error || catalogUnavailable) && <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{catalogUnavailable ? t('home.unavailable') : error}</div>}
    <section className="space-y-6"><div><span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><Globe2 size={16} /> {t('home.publishedProblems')}</span><h2 className="mt-2 text-3xl font-semibold">{t('home.catalogTitle')}</h2></div>
      {loading ? <EmptyState title={t('home.loadingCatalog')} message={t('home.loadingRecords')} /> : problems.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{problems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={(id) => onNavigate(`problema:${id}`)} />)}</div> : <EmptyState title={t('home.noProblems')} message={t('home.noProblemsMessage')} />}
    </section>
    <section className="space-y-6"><div><span className="inline-flex items-center gap-2 text-sm font-medium text-teal-700"><Sparkles size={16} /> {t('home.publishedSolutions')}</span><h2 className="mt-2 text-3xl font-semibold">{t('home.solutionsTitle')}</h2></div>
      {loading ? <EmptyState title={t('home.loadingSolutions')} message={t('home.loadingSolutionsMessage')} /> : solutions.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{solutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={(id) => onNavigate(`solucao:${id}`)} />)}</div> : <EmptyState title={t('home.noSolutions')} message={t('home.noSolutionsMessage')} />}
    </section>
  </div>;
}
