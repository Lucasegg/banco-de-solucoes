import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { CatalogToolbar, type FilterSelectConfig } from '../components/CatalogToolbar';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { ProblemCard } from '../components/Cards';
import { ProblemRepository } from '../repositories/problems';
import type { ImpactLevel, Problem, ProblemCategory, ProblemStatus } from '../types/domain';
import { useFavorites } from '../hooks/useFavorites';
import { readHashQuery, updateHashQuery, parseBooleanParam, parseEnumParam, parsePositiveInteger } from '../utils/hashQuery';
import { applyFilters, compareNewest, compareTitleAsc, getUniqueOptions, matchesSearch, sortItems, type FilterConfig, type SortOption } from '../utils/catalog';

type ProblemFilters = Record<'category' | 'status' | 'city' | 'state' | 'impact', string>;

type ProblemSort = 'recent' | 'liked' | 'commented' | 'viewed' | 'alphabetical';

const defaultFilters: ProblemFilters = { category: '', status: '', city: '', state: '', impact: '' };
const itemsPerPage = 9;
const problemSortValues: readonly ProblemSort[] = ['recent', 'liked', 'commented', 'viewed', 'alphabetical'];

const impactLabels: Record<ImpactLevel, string> = {
  local: 'Local',
  regional: 'Regional',
  national: 'Nacional',
  global: 'Global',
};

const problemSortOptions: Array<SortOption<Problem> & { value: ProblemSort }> = [
  { value: 'recent', label: 'Mais recentes', compare: compareNewest },
  { value: 'liked', label: 'Mais curtidos', compare: (a, b) => b.likes - a.likes },
  { value: 'commented', label: 'Mais comentados', compare: (a, b) => b.comments - a.comments },
  { value: 'viewed', label: 'Mais visualizados', compare: (a, b) => b.views - a.views },
  { value: 'alphabetical', label: 'Ordem alfabética', compare: compareTitleAsc },
];

const filterConfig: FilterConfig<Problem, ProblemFilters> = {
  category: (problem) => problem.category,
  status: (problem) => problem.status,
  city: (problem) => problem.city,
  state: (problem) => problem.state,
  impact: (problem) => problem.impactLevel,
};

export function ExploreProblems({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate: (page: string) => void }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProblemFilters>(defaultFilters);
  const [sort, setSort] = useState<ProblemSort>('recent');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const favorites = useFavorites('problems');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadProblems() {
      setLoading(true);
      if (!ProblemRepository) { setError('Não foi possível carregar os problemas no momento.'); setLoading(false); return; }
      const result = await ProblemRepository.list();
      if (!active) return;
      if (result.ok) { setProblems(result.data); setError(''); } else setError(result.message);
      setLoading(false);
    }
    void loadProblems();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const params = readHashQuery();
    setSearch(params.get('q') ?? '');
    setSort(parseEnumParam(params.get('sort'), problemSortValues, 'recent'));
    setFilters({
      category: params.get('category') ?? '',
      status: params.get('status') ?? '',
      city: params.get('city') ?? '',
      state: params.get('state') ?? '',
      impact: params.get('impact') ?? '',
    });
    setFavoritesOnly(parseBooleanParam(params.get('favorites')));
    setPage(parsePositiveInteger(params.get('page')));
  }, []);

  useEffect(() => {
    updateHashQuery({ q: search, sort: sort !== 'recent' ? sort : '', favorites: favoritesOnly, page: page > 1 ? page : '', ...filters });
  }, [favoritesOnly, filters, page, search, sort]);

  const filteredProblems = useMemo(() => {
    const searched = problems.filter((problem) => matchesSearch(problem, search, { fields: [(item) => item.title, (item) => item.description, (item) => item.tags] }));
    const filtered = applyFilters(searched, filters, filterConfig);
    const favoritesFiltered = favoritesOnly ? filtered.filter((problem) => favorites.isFavorite(problem.id)) : filtered;
    return sortItems(favoritesFiltered, sort, problemSortOptions);
  }, [favorites, favoritesOnly, filters, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / itemsPerPage));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedProblems = filteredProblems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const filterSelects: FilterSelectConfig[] = [
    { key: 'category', label: 'Categoria', value: filters.category, options: getUniqueOptions(problems, (problem) => problem.category).map((value) => ({ value: value as ProblemCategory, label: value })) },
    { key: 'status', label: 'Status', value: filters.status, options: getUniqueOptions(problems, (problem) => problem.status).map((value) => ({ value: value as ProblemStatus, label: value })) },
    { key: 'city', label: 'Cidade', value: filters.city, options: getUniqueOptions(problems, (problem) => problem.city).map((value) => ({ value, label: value })) },
    { key: 'state', label: 'Estado', value: filters.state, options: getUniqueOptions(problems, (problem) => problem.state).map((value) => ({ value, label: value })) },
    { key: 'impact', label: 'Impacto', value: filters.impact, options: getUniqueOptions(problems, (problem) => problem.impactLevel).map((value) => ({ value, label: impactLabels[value as ImpactLevel] })) },
  ];

  const resetPage = () => setPage(1);
  const updateFilter = (key: string, value: string) => { resetPage(); setFilters((current) => ({ ...current, [key]: value })); };
  const clearFilters = () => {
    setSearch('');
    setSort('recent');
    setFilters(defaultFilters);
    setFavoritesOnly(false);
    setPage(1);
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Banco de Problemas</h1>
          <p className="mt-3 max-w-2xl text-muted">Registros estruturados de desafios reais para orientar pesquisa, colaboração e soluções reutilizáveis.</p>
        </div>
        <button onClick={() => onNavigate('novo-problema')} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"><Plus size={16} /> Novo problema</button>
      </div>
      <CatalogToolbar search={search} searchPlaceholder="Pesquisar por título, descrição ou tags" filters={filterSelects} sort={sort} sortOptions={problemSortOptions} resultLabel={`${filteredProblems.length} ${filteredProblems.length === 1 ? 'problema encontrado' : 'problemas encontrados'}`} favoritesOnly={favoritesOnly} onSearchChange={(value) => { resetPage(); setSearch(value); }} onFilterChange={updateFilter} onSortChange={(value) => { resetPage(); setSort(value as ProblemSort); }} onFavoritesOnlyChange={(value) => { resetPage(); setFavoritesOnly(value); }} onClear={clearFilters} />
      {error && <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {favoriteMessage && <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{favoriteMessage}</div>}
      {loading ? <EmptyState title="Carregando problemas" message="Buscando problemas..." /> : filteredProblems.length === 0 ? <EmptyState title={favoritesOnly ? 'Nenhum favorito encontrado' : 'Nenhum resultado encontrado'} message={favoritesOnly ? 'Favorite problemas para encontrá-los rapidamente neste filtro.' : 'Tente ajustar a busca, os filtros ou a ordenação para encontrar outros problemas.'} actionLabel="Limpar filtros" onAction={clearFilters} /> : <>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedProblems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={onOpen} isFavorite={favorites.isFavorite(problem.id)} onToggleFavorite={(id) => { void favorites.toggleFavorite(id).then((result) => setFavoriteMessage(result.ok ? '' : (result.message ?? 'Não foi possível alterar o favorito.'))); }} />)}
        </div>
        <Pagination currentPage={page} totalItems={filteredProblems.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
      </>}
    </section>
  );
}
