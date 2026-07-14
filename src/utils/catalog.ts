export interface SearchConfig<T> {
  fields: Array<(item: T) => string | string[] | null | undefined>;
}

export type FilterConfig<T, F extends Record<string, string>> = {
  [K in keyof F]: (item: T) => string | null | undefined;
};

export interface SortOption<T> {
  value: string;
  label: string;
  compare: (a: T, b: T) => number;
}

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesSearch<T>(item: T, query: string, config: SearchConfig<T>) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return true;

  return config.fields.some((field) => {
    const rawValue = field(item);
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    return values.some((value) => value ? normalizeText(value).includes(normalizedQuery) : false);
  });
}

export function applyFilters<T, F extends Record<string, string>>(items: T[], filters: F, config: FilterConfig<T, F>) {
  return items.filter((item) =>
    (Object.keys(filters) as Array<keyof F>).every((key) => {
      const selectedValue = filters[key];
      if (!selectedValue) return true;
      return config[key](item) === selectedValue;
    }),
  );
}

export function sortItems<T>(items: T[], sortValue: string, options: Array<SortOption<T>>) {
  const selectedSort = options.find((option) => option.value === sortValue) ?? options[0];
  return [...items].sort(selectedSort.compare);
}

export function getUniqueOptions<T>(items: T[], getValue: (item: T) => string) {
  return Array.from(new Set(items.map(getValue).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function compareNewest(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function compareTitleAsc(a: { title: string }, b: { title: string }) {
  return a.title.localeCompare(b.title, 'pt-BR');
}
