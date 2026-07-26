import { useCallback, useEffect, useRef, useState } from 'react';
import { RecommendationRepository, type Recommendation } from '../repositories/recommendations';

type Kind = 'problems' | 'solutions' | 'solutionProblems';
const recommendationError = 'Não foi possível carregar as recomendações.';

function useRecommendation(id: string, kind: Kind) {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  const request = useCallback(async (offset: number, replace: boolean, version: number) => {
    setLoading(true);
    setError('');
    if (!RecommendationRepository) {
      if (version === requestVersion.current) {
        setError(recommendationError);
        setLoading(false);
      }
      return;
    }
    try {
      const result = kind === 'problems'
        ? await RecommendationRepository.relatedProblems(id, offset)
        : kind === 'solutions'
          ? await RecommendationRepository.recommendedSolutions(id, offset)
          : await RecommendationRepository.relatedProblemsForSolution(id, offset);
      if (version !== requestVersion.current) return;
      if (result.ok) {
        setItems((current) => replace ? result.data.items : [...current, ...result.data.items]);
        setTotal(result.data.total);
      } else {
        setError(result.message);
      }
    } catch {
      if (version === requestVersion.current) setError(recommendationError);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [id, kind]);

  useEffect(() => {
    const version = ++requestVersion.current;
    setItems([]);
    setTotal(0);
    void request(0, true, version);
    return () => { requestVersion.current += 1; };
  }, [id, kind, request]);

  const loadMore = useCallback(() => {
    if (loading || items.length >= total) return;
    const version = ++requestVersion.current;
    void request(items.length, false, version);
  }, [items.length, loading, request, total]);

  return { items, total, loading, error, loadMore };
}

export const useRelatedProblems = (id: string) => useRecommendation(id, 'problems');
export const useRecommendedSolutions = (id: string) => useRecommendation(id, 'solutions');
export const useRelatedProblemsForSolution = (id: string) => useRecommendation(id, 'solutionProblems');
