import { Search, SlidersHorizontal, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FilterSelectConfig {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
}

interface CatalogToolbarProps {
  search: string;
  searchPlaceholder: string;
  filters: FilterSelectConfig[];
  sort: string;
  sortOptions: SelectOption[];
  resultLabel: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
  onSortChange: (value: string) => void;
  onClear: () => void;
}

export function CatalogToolbar({ search, searchPlaceholder, filters, sort, sortOptions, resultLabel, onSearchChange, onFilterChange, onSortChange, onClear }: CatalogToolbarProps) {
  return (
    <div className="rounded-[2rem] border border-line bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Pesquisar</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={(event: { target: { value: string } }) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="h-12 w-full rounded-2xl border border-line bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100" />
          </label>
          <label className="relative lg:w-64">
            <span className="sr-only">Ordenação</span>
            <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select value={sort} onChange={(event: { target: { value: string } }) => onSortChange(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-line bg-slate-50 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {filters.map((filter) => (
            <label key={filter.key} className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{filter.label}</span>
              <select value={filter.value} onChange={(event: { target: { value: string } }) => onFilterChange(filter.key, event.target.value)} className="h-11 w-full rounded-2xl border border-line bg-slate-50 px-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100">
                <option value="">Todos</option>
                {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-700">{resultLabel}</p>
          <button type="button" onClick={onClear} className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200">
            <X size={16} /> Limpar filtros
          </button>
        </div>
      </div>
    </div>
  );
}
