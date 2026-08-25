import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Bell, Globe2, Heart, Lightbulb, MapPin, Search, Sparkles } from 'lucide-react';
import { ProblemCard, SolutionCard } from '../components/Cards';
import { EmptyState } from '../components/EmptyState';
import { ProblemRepository } from '../repositories/problems';
import { SolutionRepository } from '../repositories/solutions';
import type { Problem, Solution } from '../types/domain';
import { useTranslation } from '../i18n/I18nProvider';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import type { TranslationKey } from '../i18n/resources';

type HomeProps = { onNavigate: (page: string) => void };

const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-center text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

function Action({ page, onNavigate, children, primary = false }: { page: string; onNavigate: HomeProps['onNavigate']; children: ReactNode; primary?: boolean }) {
  return <button type="button" onClick={() => onNavigate(page)} className={`${actionClass} ${primary ? 'bg-slate-950 text-white hover:bg-slate-800 focus-visible:outline-slate-950' : 'border border-line bg-white text-slate-800 hover:bg-slate-100 focus-visible:outline-slate-700'}`}>{children}</button>;
}

export function Home({ onNavigate }: HomeProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const permissions = usePermissions(user);
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

  const steps: Array<[TranslationKey, TranslationKey, ReactNode]> = [
    ['home.how.step1.title', 'home.how.step1.description', <Search aria-hidden="true" />],
    ['home.how.step2.title', 'home.how.step2.description', <Lightbulb aria-hidden="true" />],
    ['home.how.step3.title', 'home.how.step3.description', <Heart aria-hidden="true" />],
    ['home.how.step4.title', 'home.how.step4.description', <Bell aria-hidden="true" />],
  ];

  return <div className="space-y-14">
    <section aria-labelledby="home-title" className="overflow-hidden rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8 md:p-14">
      <div className="min-w-0 max-w-4xl">
        <span className="inline-block rounded-full border border-line px-3 py-1 text-sm text-muted">{t('home.eyebrow')}</span>
        <h1 id="home-title" className="mt-6 max-w-full break-words text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">{t('home.title')}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{t('home.description')}</p>
        <div aria-label={t('home.primaryActions')} className="mt-8 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap">
          <Action page="search" onNavigate={onNavigate} primary><Search size={16} aria-hidden="true" />{t('home.searchSolutions')}</Action>
          <Action page="problemas" onNavigate={onNavigate}>{t('home.exploreProblems')}<ArrowRight size={16} aria-hidden="true" /></Action>
          <Action page="mapa" onNavigate={onNavigate}><MapPin size={16} aria-hidden="true" />{t('home.openMap')}</Action>
        </div>
        <div className="mt-6 flex flex-col items-start gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center">
          {isAuthenticated ? <>
            <p className="text-sm text-muted">{t('home.authenticatedHint', { name: user?.name ?? '' })}</p>
            <Action page="novo-problema" onNavigate={onNavigate}>{t('home.addProblem')}</Action>
            {permissions.canAccessAdmin && <Action page="admin" onNavigate={onNavigate}>{t('home.openAdmin')}</Action>}
          </> : <>
            <p className="text-sm text-muted">{t('home.visitorHint')}</p>
            <Action page="login" onNavigate={onNavigate}>{t('home.signInToContribute')}</Action>
          </>}
        </div>
      </div>
    </section>

    <section aria-labelledby="how-it-works" className="space-y-7">
      <div className="max-w-2xl"><p className="text-sm font-semibold text-teal-800">{t('home.how.eyebrow')}</p><h2 id="how-it-works" className="mt-2 text-3xl font-semibold">{t('home.how.title')}</h2><p className="mt-3 text-muted">{t('home.how.description')}</p></div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{steps.map(([title, description, icon], index) => <li key={title} className="min-w-0 rounded-3xl border border-line bg-white p-6"><div className="flex items-center justify-between text-teal-700"><span className="rounded-2xl bg-teal-50 p-2">{icon}</span><span aria-hidden="true" className="text-sm font-semibold">0{index + 1}</span></div><h3 className="mt-5 font-semibold">{t(title)}</h3><p className="mt-2 text-sm leading-6 text-muted">{t(description)}</p></li>)}</ol>
    </section>

    <section aria-labelledby="first-contribution" className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 sm:p-8">
      <div className="min-w-0 max-w-3xl"><p className="text-sm font-semibold text-sky-800">{t('home.guide.eyebrow')}</p><h2 id="first-contribution" className="mt-2 text-3xl font-semibold">{t('home.guide.title')}</h2><p className="mt-3 leading-7 text-slate-700">{t('home.guide.description')}</p><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700"><li>{t('home.guide.account')}</li><li>{t('home.guide.sources')}</li><li>{t('home.guide.moderation')}</li></ul></div>
      <div role="region" aria-label={t('home.guide.choose')} className="mt-7 grid min-w-0 gap-4 md:grid-cols-2">
        <article className="min-w-0 rounded-3xl border border-sky-100 bg-white p-5"><h3 className="text-lg font-semibold">{t('home.guide.choiceProblemTitle')}</h3><p className="mt-2 text-sm leading-6 text-muted">{t('home.guide.problem')}</p><div className="mt-5"><Action page="novo-problema" onNavigate={onNavigate} primary>{t('home.addProblem')}</Action></div></article>
        <article className="min-w-0 rounded-3xl border border-teal-100 bg-white p-5"><h3 className="text-lg font-semibold">{t('home.guide.choiceSolutionTitle')}</h3><p className="mt-2 text-sm leading-6 text-muted">{t('home.guide.solution')}</p><div className="mt-5"><Action page="nova-solucao" onNavigate={onNavigate}>{t('home.addSolution')}</Action></div></article>
      </div>
      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">{!isAuthenticated && <Action page="novo-problema" onNavigate={onNavigate} primary>{t('home.createAccount')}</Action>}<Action page="contact" onNavigate={onNavigate}>{t('home.requestSupport')}</Action></div>
    </section>

    <section className="rounded-[2rem] border border-teal-100 bg-teal-50 p-6 sm:p-8 md:flex md:items-center md:justify-between"><div className="min-w-0"><span className="text-sm font-semibold text-teal-800">{t('home.region')}</span><h2 className="mt-2 text-3xl font-semibold">{t('home.regionTitle')}</h2><p className="mt-3 text-teal-950">{t('home.regionDescription')}</p></div><button type="button" onClick={() => onNavigate('mapa')} className={`${actionClass} mt-6 bg-teal-800 text-white hover:bg-teal-900 focus-visible:outline-teal-800 md:mt-0`}>{t('home.openMap')}</button></section>
    {(error || catalogUnavailable) && <div role="status" className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{catalogUnavailable ? t('home.unavailable') : error}</div>}
    <section className="space-y-6"><div><span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><Globe2 size={16} aria-hidden="true" /> {t('home.publishedProblems')}</span><h2 className="mt-2 text-3xl font-semibold">{t('home.catalogTitle')}</h2></div>
      {loading ? <EmptyState title={t('home.loadingCatalog')} message={t('home.loadingRecords')} /> : problems.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{problems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={(id) => onNavigate(`problema:${id}`)} />)}</div> : <EmptyState title={t('home.noProblems')} message={t('home.noProblemsMessage')} />}
    </section>
    <section className="space-y-6"><div><span className="inline-flex items-center gap-2 text-sm font-medium text-teal-700"><Sparkles size={16} aria-hidden="true" /> {t('home.publishedSolutions')}</span><h2 className="mt-2 text-3xl font-semibold">{t('home.solutionsTitle')}</h2></div>
      {loading ? <EmptyState title={t('home.loadingSolutions')} message={t('home.loadingSolutionsMessage')} /> : solutions.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{solutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={(id) => onNavigate(`solucao:${id}`)} />)}</div> : <EmptyState title={t('home.noSolutions')} message={t('home.noSolutionsMessage')} />}
    </section>
  </div>;
}
