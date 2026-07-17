import { Heart } from 'lucide-react';
import { ProblemCard, SolutionCard } from '../components/Cards';
import { EmptyState } from '../components/EmptyState';
import { useFavorites } from '../hooks/useFavorites';

export function Favorites({ onNavigate }: { onNavigate: (page: string) => void }) {
  const favorites = useFavorites();
  const favoriteProblems = favorites.favorites.problems.map((favorite) => favorite.problem).filter((problem): problem is NonNullable<typeof problem> => Boolean(problem));
  const favoriteSolutions = favorites.favorites.solutions.map((favorite) => favorite.solution).filter((solution): solution is NonNullable<typeof solution> => Boolean(solution));
  const hasFavorites = favoriteProblems.length > 0 || favoriteSolutions.length > 0;

  return (
    <section className="space-y-10">
      <div className="rounded-[2rem] border border-rose-100 bg-white p-8 shadow-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700"><Heart size={16} fill="currentColor" /> /favorites</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Meus Favoritos</h1>
        <p className="mt-3 max-w-2xl text-muted">Acesse rapidamente os problemas e soluções que você marcou como favoritos na sua conta.</p>
        {favorites.error && <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{favorites.error}</div>}
      </div>

      {favorites.isLoading ? <EmptyState title="Carregando favoritos" message="Buscando seus favoritos..." /> : !hasFavorites ? <EmptyState title="Nenhum favorito ainda" message="Favorite problemas e soluções para encontrá-los nesta página." actionLabel="Explorar problemas" onAction={() => onNavigate('problemas')} /> : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Problemas favoritados</h2>
              <span className="text-sm font-medium text-muted">{favoriteProblems.length} itens</span>
            </div>
            {favoriteProblems.length === 0 ? <EmptyState title="Nenhum problema favoritado" message="Marque problemas como favoritos para vê-los aqui." /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{favoriteProblems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={(id) => onNavigate(`problema:${id}`)} isFavorite onToggleFavorite={(id) => { void favorites.toggleFavorite(id, 'problems'); }} />)}</div>}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Soluções favoritadas</h2>
              <span className="text-sm font-medium text-muted">{favoriteSolutions.length} itens</span>
            </div>
            {favoriteSolutions.length === 0 ? <EmptyState title="Nenhuma solução favoritada" message="Marque soluções como favoritas para vê-las aqui." /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{favoriteSolutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={(id) => onNavigate(`solucao:${id}`)} isFavorite onToggleFavorite={(id) => { void favorites.toggleFavorite(id, 'solutions'); }} />)}</div>}
          </section>
        </>
      )}
    </section>
  );
}
