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
import { useTranslation } from '../i18n/I18nProvider';
import { formatMessageCount } from '../i18n/format';
import { difficultyKeys, knownCategoryKeys, maturityLevelKeys, solutionStatusKeys } from '../i18n/presentation';
import type { TranslationKey } from '../i18n/resources';

type SolutionFilters = Record<'category' | 'status' | 'maturity' | 'difficulty' | 'organization', string>;
type SolutionSort = 'recent' | 'liked' | 'viewed' | 'alphabetical';

const defaultFilters: SolutionFilters = { category: '', status: '', maturity: '', difficulty: '', organization: '' };
const itemsPerPage = 9;
const solutionSortValues: readonly SolutionSort[] = ['recent', 'liked', 'viewed', 'alphabetical'];

const solutionSortOptions: Array<Omit<SortOption<Solution>, 'label'> & { value: SolutionSort; label: TranslationKey }> = [
  { value: 'recent', label: 'sort.recent', compare: compareNewest },
  { value: 'liked', label: 'sort.mostLikedFemale', compare: (a, b) => b.likes - a.likes },
  { value: 'viewed', label: 'sort.mostViewed', compare: (a, b) => b.views - a.views },
  { value: 'alphabetical', label: 'sort.alphabetical', compare: compareTitleAsc },
];

const filterConfig: FilterConfig<Solution, SolutionFilters> = {
  category: (solution) => solution.category,
  status: (solution) => solution.status,
  maturity: (solution) => solution.maturityLevel,
  difficulty: (solution) => solution.implementationDifficulty,
  organization: (solution) => solution.organization,
};

export function ExploreSolutions({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate: (page: string) => void }) {
  const { locale, t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SolutionFilters>(defaultFilters);
  const [sort, setSort] = useState<SolutionSort>('recent');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const favorites = useFavorites('solutions');
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repositoryUnavailable, setRepositoryUnavailable] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadSolutions() {
      setLoading(true);
      if (!SolutionRepository) { setRepositoryUnavailable(true); setLoading(false); return; }
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
    { key: 'category', label: t('filter.category'), value: filters.category, options: getUniqueOptions(solutions, (solution) => solution.category).map((value) => ({ value: value as SolutionCategory, label: value in knownCategoryKeys ? t(knownCategoryKeys[value as keyof typeof knownCategoryKeys]) : value })) },
    { key: 'status', label: t('filter.status'), value: filters.status, options: getUniqueOptions(solutions, (solution) => solution.status).map((value) => ({ value: value as SolutionStatus, label: t(solutionStatusKeys[value as SolutionStatus]) })) },
    { key: 'maturity', label: t('filter.maturity'), value: filters.maturity, options: getUniqueOptions(solutions, (solution) => solution.maturityLevel).map((value) => ({ value: value as SolutionMaturityLevel, label: t(maturityLevelKeys[value as SolutionMaturityLevel]) })) },
    { key: 'difficulty', label: t('filter.difficulty'), value: filters.difficulty, options: getUniqueOptions(solutions, (solution) => solution.implementationDifficulty).map((value) => ({ value: value as ImplementationDifficulty, label: t(difficultyKeys[value as ImplementationDifficulty]) })) },
    { key: 'organization', label: t('filter.organization'), value: filters.organization, options: getUniqueOptions(solutions, (solution) => solution.organization).map((value) => ({ value, label: value })) },
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
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t('explore.solutionTitle')}</h1>
          <p className="mt-3 max-w-2xl text-muted">{t('explore.solutionDescription')}</p>
        </div>
        <button onClick={() => onNavigate('nova-solucao')} className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400"><Plus size={16} /> {t('explore.newSolution')}</button>
      </div>
      <CatalogToolbar search={search} searchPlaceholder={t('explore.solutionSearch')} filters={filterSelects} sort={sort} sortOptions={solutionSortOptions.map((option) => ({ ...option, label: t(option.label) }))} resultLabel={formatMessageCount(filteredSolutions.length, locale, t, 'explore.solutionCount.one', 'explore.solutionCount.other')} favoritesOnly={favoritesOnly} onSearchChange={(value) => { resetPage(); setSearch(value); }} onFilterChange={updateFilter} onSortChange={(value) => { resetPage(); setSort(value as SolutionSort); }} onFavoritesOnlyChange={(value) => { resetPage(); setFavoritesOnly(value); }} onClear={clearFilters} />
      {(error || repositoryUnavailable) && <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{repositoryUnavailable ? t('explore.solutionLoadFailed') : error}</div>}
      {favoriteMessage && <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{favoriteMessage}</div>}
      {loading ? <EmptyState title={t('explore.loadingSolutions')} message={t('explore.fetchingSolutions')} /> : filteredSolutions.length === 0 ? <EmptyState title={favoritesOnly ? t('explore.noFavorite') : t('common.noResults')} message={favoritesOnly ? t('explore.favoriteSolutionsHint') : solutions.length === 0 ? t('explore.noPublished') : t('explore.adjustSolutions')} actionLabel={t('toolbar.clear')} onAction={clearFilters} /> : <>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedSolutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={onOpen} isFavorite={favorites.isFavorite(solution.id)} onToggleFavorite={(id) => { void favorites.toggleFavorite(id).then((result) => setFavoriteMessage(result.ok ? '' : (result.message ?? t('explore.favoriteFailed')))); }} />)}
        </div>
        <Pagination currentPage={page} totalItems={filteredSolutions.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
      </>}
    </section>
  );
}
