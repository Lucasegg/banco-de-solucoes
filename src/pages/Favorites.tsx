import { Heart } from 'lucide-react';
import { ProblemCard, SolutionCard } from '../components/Cards';
import { EmptyState } from '../components/EmptyState';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from '../i18n/I18nProvider';
import { formatCount } from '../i18n/format';

export function Favorites({ onNavigate }: { onNavigate: (page: string) => void }) {
  const favorites = useFavorites();
  const { locale, t } = useTranslation();
  const favoriteProblems = favorites.favorites.problems.map((favorite) => favorite.problem).filter((problem): problem is NonNullable<typeof problem> => Boolean(problem));
  const favoriteSolutions = favorites.favorites.solutions.map((favorite) => favorite.solution).filter((solution): solution is NonNullable<typeof solution> => Boolean(solution));
  const hasFavorites = favoriteProblems.length > 0 || favoriteSolutions.length > 0;

  return (
    <section className="space-y-10">
      <div className="rounded-[2rem] border border-rose-100 bg-white p-8 shadow-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700"><Heart size={16} fill="currentColor" /> /favorites</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{t('favorites.title')}</h1>
        <p className="mt-3 max-w-2xl text-muted">{t('favorites.description')}</p>
        {favorites.error && <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{favorites.error}</div>}
      </div>

      {favorites.isLoading ? <EmptyState title={t('favorites.loading')} message={t('favorites.loadingMessage')} /> : !hasFavorites ? <EmptyState title={t('favorites.empty')} message={t('favorites.emptyMessage')} actionLabel={t('home.exploreProblems')} onAction={() => onNavigate('problemas')} /> : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">{t('favorites.problems')}</h2>
              <span className="text-sm font-medium text-muted">{formatCount(favoriteProblems.length, locale, t, 'count.item.one', 'count.item.other')}</span>
            </div>
            {favoriteProblems.length === 0 ? <EmptyState title={t('favorites.noProblem')} message={t('favorites.noProblemMessage')} /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{favoriteProblems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={(id) => onNavigate(`problema:${id}`)} isFavorite onToggleFavorite={(id) => { void favorites.toggleFavorite(id, 'problems'); }} />)}</div>}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">{t('favorites.solutions')}</h2>
              <span className="text-sm font-medium text-muted">{formatCount(favoriteSolutions.length, locale, t, 'count.item.one', 'count.item.other')}</span>
            </div>
            {favoriteSolutions.length === 0 ? <EmptyState title={t('favorites.noSolution')} message={t('favorites.noSolutionMessage')} /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{favoriteSolutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={(id) => onNavigate(`solucao:${id}`)} isFavorite onToggleFavorite={(id) => { void favorites.toggleFavorite(id, 'solutions'); }} />)}</div>}
          </section>
        </>
      )}
    </section>
  );
}
