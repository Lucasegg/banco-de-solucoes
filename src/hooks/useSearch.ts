import { useEffect, useRef, useState } from 'react';
import { SearchRepository, type ProblemSearchFilters, type SearchResponse, type SolutionSearchFilters } from '../repositories/search';

export function useSearch(tab: 'problems' | 'solutions', filters: ProblemSearchFilters | SolutionSearchFilters) {
  const [state, setState] = useState<{ loading: boolean; error: string; data: SearchResponse }>({ loading: true, error: '', data: { items: [], total: 0 } });
  const key = JSON.stringify(filters);
  const latest = useRef(0);
  useEffect(() => { const request = ++latest.current; const timer = window.setTimeout(async () => { if (!SearchRepository) { if (request === latest.current) setState({ loading: false, error: 'Não foi possível concluir a busca.', data: { items: [], total: 0 } }); return; } setState((previous) => ({ ...previous, loading: true, error: '' })); const result = tab === 'problems' ? await SearchRepository.searchProblems(filters as ProblemSearchFilters) : await SearchRepository.searchSolutions(filters as SolutionSearchFilters); if (request !== latest.current) return; setState(result.ok ? { loading: false, error: '', data: result.data } : { loading: false, error: result.message, data: { items: [], total: 0 } }); }, 350); return () => window.clearTimeout(timer); }, [key, tab]);
  return state;
}
