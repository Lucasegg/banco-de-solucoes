import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { CatalogToolbar, type FilterSelectConfig } from '../components/CatalogToolbar';
import { ProblemCard } from '../components/Cards';
import { problems } from '../data/mockData';
import type { ImpactLevel, Problem, ProblemCategory, ProblemStatus } from '../types/domain';
import { applyFilters, compareNewest, compareTitleAsc, getUniqueOptions, matchesSearch, sortItems, type FilterConfig, type SortOption } from '../utils/catalog';

type ProblemFilters = Record<'category' | 'status' | 'city' | 'state' | 'impact', string>;

type ProblemSort = 'recent' | 'liked' | 'commented' | 'viewed' | 'alphabetical';

const defaultFilters: ProblemFilters = { category: '', status: '', city: '', state: '', impact: '' };

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

function getHashSearchParams() {
  return new URLSearchParams((window.location.hash.split('?')[1] ?? '').split('#')[0]);
}

function updateHashQuery(params: URLSearchParams) {
  const [path = '#/problems'] = window.location.hash.split('?');
  const query = params.toString();
  window.history.replaceState(null, '', `${path}${query ? `?${query}` : ''}`);
}

export function ExploreProblems({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate: (page: string) => void }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProblemFilters>(defaultFilters);
  const [sort, setSort] = useState<ProblemSort>('recent');

  useEffect(() => {
    const params = getHashSearchParams();
    setSearch(params.get('q') ?? '');
    setSort((params.get('sort') as ProblemSort) || 'recent');
    setFilters({
      category: params.get('category') ?? '',
      status: params.get('status') ?? '',
      city: params.get('city') ?? '',
      state: params.get('state') ?? '',
      impact: params.get('impact') ?? '',
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

  const filteredProblems = useMemo(() => {
    const searched = problems.filter((problem) => matchesSearch(problem, search, { fields: [(item) => item.title, (item) => item.description, (item) => item.tags] }));
    return sortItems(applyFilters(searched, filters, filterConfig), sort, problemSortOptions);
  }, [filters, search, sort]);

  const filterSelects: FilterSelectConfig[] = [
    { key: 'category', label: 'Categoria', value: filters.category, options: getUniqueOptions(problems, (problem) => problem.category).map((value) => ({ value: value as ProblemCategory, label: value })) },
    { key: 'status', label: 'Status', value: filters.status, options: getUniqueOptions(problems, (problem) => problem.status).map((value) => ({ value: value as ProblemStatus, label: value })) },
    { key: 'city', label: 'Cidade', value: filters.city, options: getUniqueOptions(problems, (problem) => problem.city).map((value) => ({ value, label: value })) },
    { key: 'state', label: 'Estado', value: filters.state, options: getUniqueOptions(problems, (problem) => problem.state).map((value) => ({ value, label: value })) },
    { key: 'impact', label: 'Impacto', value: filters.impact, options: getUniqueOptions(problems, (problem) => problem.impactLevel).map((value) => ({ value, label: impactLabels[value as ImpactLevel] })) },
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
          <span className="text-sm font-medium text-muted">/problems</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Banco de Problemas</h1>
          <p className="mt-3 max-w-2xl text-muted">Registros estruturados de desafios reais para orientar pesquisa, colaboração e soluções reutilizáveis.</p>
        </div>
        <button onClick={() => onNavigate('novo-problema')} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"><Plus size={16} /> Novo problema</button>
      </div>
      <CatalogToolbar search={search} searchPlaceholder="Pesquisar por título, descrição ou tags" filters={filterSelects} sort={sort} sortOptions={problemSortOptions} resultLabel={`${filteredProblems.length} ${filteredProblems.length === 1 ? 'problema encontrado' : 'problemas encontrados'}`} onSearchChange={setSearch} onFilterChange={updateFilter} onSortChange={(value) => setSort(value as ProblemSort)} onClear={clearFilters} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredProblems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
