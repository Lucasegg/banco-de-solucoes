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
import { useTranslation } from '../i18n/I18nProvider';
import { formatMessageCount } from '../i18n/format';
import { impactLevelKeys, knownCategoryKeys, problemStatusKeys } from '../i18n/presentation';
import type { TranslationKey } from '../i18n/resources';

type ProblemFilters = Record<'category' | 'status' | 'city' | 'state' | 'impact', string>;

type ProblemSort = 'recent' | 'liked' | 'commented' | 'viewed' | 'alphabetical';

const defaultFilters: ProblemFilters = { category: '', status: '', city: '', state: '', impact: '' };
const itemsPerPage = 9;
const problemSortValues: readonly ProblemSort[] = ['recent', 'liked', 'commented', 'viewed', 'alphabetical'];

const problemSortOptions: Array<Omit<SortOption<Problem>, 'label'> & { value: ProblemSort; label: TranslationKey }> = [
  { value: 'recent', label: 'sort.recent', compare: compareNewest },
  { value: 'liked', label: 'sort.mostLikedMale', compare: (a, b) => b.likes - a.likes },
  { value: 'commented', label: 'sort.mostCommented', compare: (a, b) => b.comments - a.comments },
  { value: 'viewed', label: 'sort.mostViewed', compare: (a, b) => b.views - a.views },
  { value: 'alphabetical', label: 'sort.alphabetical', compare: compareTitleAsc },
];

const filterConfig: FilterConfig<Problem, ProblemFilters> = {
  category: (problem) => problem.category,
  status: (problem) => problem.status,
  city: (problem) => problem.city,
  state: (problem) => problem.state,
  impact: (problem) => problem.impactLevel,
};

export function ExploreProblems({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate: (page: string) => void }) {
  const { locale, t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProblemFilters>(defaultFilters);
  const [sort, setSort] = useState<ProblemSort>('recent');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const favorites = useFavorites('problems');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repositoryUnavailable, setRepositoryUnavailable] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadProblems() {
      setLoading(true);
      if (!ProblemRepository) { setRepositoryUnavailable(true); setLoading(false); return; }
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
    { key: 'category', label: t('filter.category'), value: filters.category, options: getUniqueOptions(problems, (problem) => problem.category).map((value) => ({ value: value as ProblemCategory, label: value in knownCategoryKeys ? t(knownCategoryKeys[value as keyof typeof knownCategoryKeys]) : value })) },
    { key: 'status', label: t('filter.status'), value: filters.status, options: getUniqueOptions(problems, (problem) => problem.status).map((value) => ({ value: value as ProblemStatus, label: t(problemStatusKeys[value as ProblemStatus]) })) },
    { key: 'city', label: t('filter.city'), value: filters.city, options: getUniqueOptions(problems, (problem) => problem.city).map((value) => ({ value, label: value })) },
    { key: 'state', label: t('filter.state'), value: filters.state, options: getUniqueOptions(problems, (problem) => problem.state).map((value) => ({ value, label: value })) },
    { key: 'impact', label: t('filter.impact'), value: filters.impact, options: getUniqueOptions(problems, (problem) => problem.impactLevel).map((value) => ({ value, label: t(impactLevelKeys[value as ImpactLevel]) })) },
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
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t('explore.problemTitle')}</h1>
          <p className="mt-3 max-w-2xl text-muted">{t('explore.problemDescription')}</p>
        </div>
        <button onClick={() => onNavigate('novo-problema')} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"><Plus size={16} /> {t('explore.newProblem')}</button>
      </div>
      <CatalogToolbar search={search} searchPlaceholder={t('explore.problemSearch')} filters={filterSelects} sort={sort} sortOptions={problemSortOptions.map((option) => ({ ...option, label: t(option.label) }))} resultLabel={formatMessageCount(filteredProblems.length, locale, t, 'explore.problemCount.one', 'explore.problemCount.other')} favoritesOnly={favoritesOnly} onSearchChange={(value) => { resetPage(); setSearch(value); }} onFilterChange={updateFilter} onSortChange={(value) => { resetPage(); setSort(value as ProblemSort); }} onFavoritesOnlyChange={(value) => { resetPage(); setFavoritesOnly(value); }} onClear={clearFilters} />
      {(error || repositoryUnavailable) && <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{repositoryUnavailable ? t('explore.problemLoadFailed') : error}</div>}
      {favoriteMessage && <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{favoriteMessage}</div>}
      {loading ? <EmptyState title={t('explore.loadingProblems')} message={t('explore.fetchingProblems')} /> : filteredProblems.length === 0 ? <EmptyState title={favoritesOnly ? t('explore.noFavorite') : t('common.noResults')} message={favoritesOnly ? t('explore.favoriteProblemsHint') : problems.length === 0 ? t('explore.noPublished') : t('explore.adjustProblems')} actionLabel={t('toolbar.clear')} onAction={clearFilters} /> : <>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedProblems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={onOpen} isFavorite={favorites.isFavorite(problem.id)} onToggleFavorite={(id) => { void favorites.toggleFavorite(id).then((result) => setFavoriteMessage(result.ok ? '' : (result.message ?? t('explore.favoriteFailed')))); }} />)}
        </div>
        <Pagination currentPage={page} totalItems={filteredProblems.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
      </>}
    </section>
  );
}
