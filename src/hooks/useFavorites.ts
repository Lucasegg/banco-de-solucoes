import { useCallback, useEffect, useMemo, useState } from 'react';
import { FavoriteRepository, type Favorite, type FavoriteKind } from '../repositories/favorites';
import { useAuth } from './useAuth';

export type { Favorite, FavoriteKind };

type FavoriteState = Record<FavoriteKind, Favorite[]>;
const emptyFavorites: FavoriteState = { problems: [], solutions: [] };

export function useFavorites(kind?: FavoriteKind) {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteState>(emptyFavorites);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!user || !isAuthenticated || !FavoriteRepository) {
      setFavorites(emptyFavorites);
      setError('');
      return;
    }
    setIsLoading(true);
    const result = await FavoriteRepository.listByUser(user.id);
    if (result.ok) {
      setFavorites(result.data);
      setError('');
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, [isAuthenticated, user]);

  useEffect(() => { void reload(); }, [reload]);

  const favoriteIds = useMemo(() => kind ? favorites[kind].map((favorite) => favorite.problemId ?? favorite.solutionId).filter((id): id is string => Boolean(id)) : [], [favorites, kind]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback((id: string) => favoriteSet.has(id), [favoriteSet]);

  const setOptimistic = useCallback((targetKind: FavoriteKind, id: string, favorite: boolean) => {
    setFavorites((current) => {
      const exists = current[targetKind].some((item) => (targetKind === 'problems' ? item.problemId : item.solutionId) === id);
      if (favorite && exists) return current;
      if (!favorite && !exists) return current;
      const optimistic: Favorite = { id: `optimistic-${targetKind}-${id}`, userId: user?.id ?? '', problemId: targetKind === 'problems' ? id : null, solutionId: targetKind === 'solutions' ? id : null, createdAt: new Date().toISOString() };
      return { ...current, [targetKind]: favorite ? [optimistic, ...current[targetKind]] : current[targetKind].filter((item) => (targetKind === 'problems' ? item.problemId : item.solutionId) !== id) };
    });
  }, [user?.id]);

  const addFavorite = useCallback(async (id: string, targetKind: FavoriteKind | undefined = kind) => {
    if (!targetKind) return { ok: false, message: 'Tipo de favorito não informado.' };
    if (!user || !isAuthenticated) return { ok: false, message: 'Entre na sua conta para favoritar.' };
    if (!FavoriteRepository) return { ok: false, message: 'Supabase não configurado para favoritos.' };
    setOptimistic(targetKind, id, true);
    const result = await FavoriteRepository.add(user.id, { kind: targetKind, id });
    if (!result.ok) { setOptimistic(targetKind, id, false); setError(result.message); return result; }
    await reload();
    return result;
  }, [isAuthenticated, kind, reload, setOptimistic, user]);

  const removeFavorite = useCallback(async (id: string, targetKind: FavoriteKind | undefined = kind) => {
    if (!targetKind) return { ok: false, message: 'Tipo de favorito não informado.' };
    if (!user || !isAuthenticated) return { ok: false, message: 'Entre na sua conta para alterar favoritos.' };
    if (!FavoriteRepository) return { ok: false, message: 'Supabase não configurado para favoritos.' };
    setOptimistic(targetKind, id, false);
    const result = await FavoriteRepository.remove(user.id, { kind: targetKind, id });
    if (!result.ok) { setOptimistic(targetKind, id, true); setError(result.message); return result; }
    await reload();
    return result;
  }, [isAuthenticated, kind, reload, setOptimistic, user]);

  const toggleFavorite = useCallback(async (id: string, targetKind: FavoriteKind | undefined = kind) => {
    if (!targetKind) return { ok: false, message: 'Tipo de favorito não informado.' };
    return favorites[targetKind].some((item) => (targetKind === 'problems' ? item.problemId : item.solutionId) === id)
      ? removeFavorite(id, targetKind)
      : addFavorite(id, targetKind);
  }, [addFavorite, favorites, kind, removeFavorite]);

  return { favorites, favoriteIds, isFavorite, addFavorite, removeFavorite, toggleFavorite, reload, isLoading, error };
}
