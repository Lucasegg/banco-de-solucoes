import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { CatalogToolbar, type FilterSelectConfig } from '../components/CatalogToolbar';
import { SolutionCard } from '../components/Cards';
import { solutions } from '../data/mockData';
import type { ImplementationDifficulty, Solution, SolutionCategory, SolutionMaturityLevel, SolutionStatus } from '../types/domain';
import { applyFilters, compareNewest, compareTitleAsc, getUniqueOptions, matchesSearch, sortItems, type FilterConfig, type SortOption } from '../utils/catalog';

type SolutionFilters = Record<'category' | 'status' | 'maturity' | 'difficulty' | 'organization', string>;
type SolutionSort = 'recent' | 'liked' | 'viewed' | 'alphabetical';

const defaultFilters: SolutionFilters = { category: '', status: '', maturity: '', difficulty: '', organization: '' };

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

function getHashSearchParams() {
  return new URLSearchParams((window.location.hash.split('?')[1] ?? '').split('#')[0]);
}

function updateHashQuery(params: URLSearchParams) {
  const [path = '#/solutions'] = window.location.hash.split('?');
  const query = params.toString();
  window.history.replaceState(null, '', `${path}${query ? `?${query}` : ''}`);
}

export function ExploreSolutions({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate: (page: string) => void }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SolutionFilters>(defaultFilters);
  const [sort, setSort] = useState<SolutionSort>('recent');

  useEffect(() => {
    const params = getHashSearchParams();
    setSearch(params.get('q') ?? '');
    setSort((params.get('sort') as SolutionSort) || 'recent');
    setFilters({
      category: params.get('category') ?? '',
      status: params.get('status') ?? '',
      maturity: params.get('maturity') ?? '',
      difficulty: params.get('difficulty') ?? '',
      organization: params.get('organization') ?? '',
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (sort !== 'recent') params.set('sort', sort);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    updateHashQuery(params);
  }, [filters, search, sort]);

  const filteredSolutions = useMemo(() => {
    const searched = solutions.filter((solution) => matchesSearch(solution, search, { fields: [(item) => item.title, (item) => item.description, (item) => item.summary, (item) => item.tags] }));
    return sortItems(applyFilters(searched, filters, filterConfig), sort, solutionSortOptions);
  }, [filters, search, sort]);

  const filterSelects: FilterSelectConfig[] = [
    { key: 'category', label: 'Categoria', value: filters.category, options: getUniqueOptions(solutions, (solution) => solution.category).map((value) => ({ value: value as SolutionCategory, label: value })) },
    { key: 'status', label: 'Status', value: filters.status, options: getUniqueOptions(solutions, (solution) => solution.status).map((value) => ({ value: value as SolutionStatus, label: value })) },
    { key: 'maturity', label: 'Maturidade', value: filters.maturity, options: getUniqueOptions(solutions, (solution) => solution.maturityLevel).map((value) => ({ value: value as SolutionMaturityLevel, label: value })) },
    { key: 'difficulty', label: 'Dificuldade', value: filters.difficulty, options: getUniqueOptions(solutions, (solution) => solution.implementationDifficulty).map((value) => ({ value: value as ImplementationDifficulty, label: value })) },
    { key: 'organization', label: 'Organização', value: filters.organization, options: getUniqueOptions(solutions, (solution) => solution.organization).map((value) => ({ value, label: value })) },
  ];

  const updateFilter = (key: string, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => {
    setSearch('');
    setSort('recent');
    setFilters(defaultFilters);
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-sm font-medium text-muted">/solutions</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Banco de Soluções</h1>
          <p className="mt-3 max-w-2xl text-muted">Ideias, pilotos e iniciativas validadas conectadas por ID aos problemas que pretendem resolver.</p>
        </div>
        <button onClick={() => onNavigate('nova-solucao')} className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400"><Plus size={16} /> Nova solução</button>
      </div>
      <CatalogToolbar search={search} searchPlaceholder="Pesquisar soluções por título, descrição ou tags" filters={filterSelects} sort={sort} sortOptions={solutionSortOptions} resultLabel={`${filteredSolutions.length} ${filteredSolutions.length === 1 ? 'solução encontrada' : 'soluções encontradas'}`} onSearchChange={setSearch} onFilterChange={updateFilter} onSortChange={(value) => setSort(value as SolutionSort)} onClear={clearFilters} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredSolutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
