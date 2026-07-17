import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { CatalogToolbar, type FilterSelectConfig } from '../components/CatalogToolbar';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { SolutionCard } from '../components/Cards';
import { SolutionRepository } from '../repositories/solutions';
import type { ImplementationDifficulty, Solution, SolutionCategory, SolutionMaturityLevel, SolutionStatus } from '../types/domain';
import { useFavorites } from '../hooks/useFavorites';
import { readHashQuery, updateHashQuery, parseBooleanParam, parseEnumParam, parsePositiveInteger } from '../utils/hashQuery';
import { applyFilters, compareNewest, compareTitleAsc, getUniqueOptions, matchesSearch, sortItems, type FilterConfig, type SortOption } from '../utils/catalog';

type SolutionFilters = Record<'category' | 'status' | 'maturity' | 'difficulty' | 'organization', string>;
type SolutionSort = 'recent' | 'liked' | 'viewed' | 'alphabetical';

const defaultFilters: SolutionFilters = { category: '', status: '', maturity: '', difficulty: '', organization: '' };
const itemsPerPage = 9;
const solutionSortValues: readonly SolutionSort[] = ['recent', 'liked', 'viewed', 'alphabetical'];

const solutionSortOptions: Array<SortOption<Solution> & { value: SolutionSort }> = [
  { value: 'recent', label: 'Mais recentes', compare: compareNewest },
  { value: 'liked', label: 'Mais curtidas', compare: (a, b) => b.likes - a.likes },
  { value: 'viewed', label: 'Mais visualizações', compare: (a, b) => b.views - a.views },
  { value: 'alphabetical', label: 'Ordem alfabética', compare: compareTitleAsc },
];

const filterConfig: FilterConfig<Solution, SolutionFilters> = {
  category: (solution) => solution.category,
  status: (solution) => solution.status,
  maturity: (solution) => solution.maturityLevel,
  difficulty: (solution) => solution.implementationDifficulty,
  organization: (solution) => solution.organization,
};

export function ExploreSolutions({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate: (page: string) => void }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SolutionFilters>(defaultFilters);
  const [sort, setSort] = useState<SolutionSort>('recent');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const favorites = useFavorites('solutions');
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadSolutions() {
      setLoading(true);
      if (!SolutionRepository) { setError('Não foi possível carregar as soluções no momento.'); setLoading(false); return; }
      const result = await SolutionRepository.list();
      if (!active) return;
      if (result.ok) { setSolutions(result.data); setError(''); } else setError(result.message);
      setLoading(false);
    }
    void loadSolutions();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const params = readHashQuery();
    setSearch(params.get('q') ?? '');
    setSort(parseEnumParam(params.get('sort'), solutionSortValues, 'recent'));
    setFilters({
      category: params.get('category') ?? '',
      status: params.get('status') ?? '',
      maturity: params.get('maturity') ?? '',
      difficulty: params.get('difficulty') ?? '',
      organization: params.get('organization') ?? '',
    });
    setFavoritesOnly(parseBooleanParam(params.get('favorites')));
    setPage(parsePositiveInteger(params.get('page')));
  }, []);

  useEffect(() => {
    updateHashQuery({ q: search, sort: sort !== 'recent' ? sort : '', favorites: favoritesOnly, page: page > 1 ? page : '', ...filters });
  }, [favoritesOnly, filters, page, search, sort]);

  const filteredSolutions = useMemo(() => {
    const searched = solutions.filter((solution) => matchesSearch(solution, search, { fields: [(item) => item.title, (item) => item.description, (item) => item.summary, (item) => item.tags] }));
    const filtered = applyFilters(searched, filters, filterConfig);
    const favoritesFiltered = favoritesOnly ? filtered.filter((solution) => favorites.isFavorite(solution.id)) : filtered;
    return sortItems(favoritesFiltered, sort, solutionSortOptions);
  }, [favorites, favoritesOnly, filters, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredSolutions.length / itemsPerPage));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedSolutions = filteredSolutions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const filterSelects: FilterSelectConfig[] = [
    { key: 'category', label: 'Categoria', value: filters.category, options: getUniqueOptions(solutions, (solution) => solution.category).map((value) => ({ value: value as SolutionCategory, label: value })) },
    { key: 'status', label: 'Status', value: filters.status, options: getUniqueOptions(solutions, (solution) => solution.status).map((value) => ({ value: value as SolutionStatus, label: value })) },
    { key: 'maturity', label: 'Maturidade', value: filters.maturity, options: getUniqueOptions(solutions, (solution) => solution.maturityLevel).map((value) => ({ value: value as SolutionMaturityLevel, label: value })) },
    { key: 'difficulty', label: 'Dificuldade', value: filters.difficulty, options: getUniqueOptions(solutions, (solution) => solution.implementationDifficulty).map((value) => ({ value: value as ImplementationDifficulty, label: value })) },
    { key: 'organization', label: 'Organização', value: filters.organization, options: getUniqueOptions(solutions, (solution) => solution.organization).map((value) => ({ value, label: value })) },
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
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Banco de Soluções</h1>
          <p className="mt-3 max-w-2xl text-muted">Ideias, pilotos e iniciativas validadas conectadas por ID aos problemas que pretendem resolver.</p>
        </div>
        <button onClick={() => onNavigate('nova-solucao')} className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400"><Plus size={16} /> Nova solução</button>
      </div>
      <CatalogToolbar search={search} searchPlaceholder="Pesquisar soluções por título, descrição ou tags" filters={filterSelects} sort={sort} sortOptions={solutionSortOptions} resultLabel={`${filteredSolutions.length} ${filteredSolutions.length === 1 ? 'solução encontrada' : 'soluções encontradas'}`} favoritesOnly={favoritesOnly} onSearchChange={(value) => { resetPage(); setSearch(value); }} onFilterChange={updateFilter} onSortChange={(value) => { resetPage(); setSort(value as SolutionSort); }} onFavoritesOnlyChange={(value) => { resetPage(); setFavoritesOnly(value); }} onClear={clearFilters} />
      {error && <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? <EmptyState title="Carregando soluções" message="Buscando soluções..." /> : filteredSolutions.length === 0 ? <EmptyState title={favoritesOnly ? 'Nenhum favorito encontrado' : 'Nenhum resultado encontrado'} message={favoritesOnly ? 'Favorite soluções para encontrá-las rapidamente neste filtro.' : 'Tente ajustar a busca, os filtros ou a ordenação para encontrar outras soluções.'} actionLabel="Limpar filtros" onAction={clearFilters} /> : <>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedSolutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={onOpen} isFavorite={favorites.isFavorite(solution.id)} onToggleFavorite={(id) => { void favorites.toggleFavorite(id); }} />)}
        </div>
        <Pagination currentPage={page} totalItems={filteredSolutions.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
      </>}
    </section>
  );
}
