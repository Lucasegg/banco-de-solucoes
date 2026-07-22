import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FavoriteRepository, type Favorite, type FavoriteKind } from '../repositories/favorites';
import { useAuth } from './useAuth';

export type { Favorite, FavoriteKind };

type FavoriteState = Record<FavoriteKind, Favorite[]>;
const emptyFavorites: FavoriteState = { problems: [], solutions: [] };
const matchesFavoriteTarget = (favorite: Favorite, targetKind: FavoriteKind, id: string) => (targetKind === 'problems' ? favorite.problemId : favorite.solutionId) === id;

export function useFavorites(kind?: FavoriteKind) {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteState>(emptyFavorites);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(new Set<string>());

  const reload = useCallback(async () => {
    if (!user || !isAuthenticated || !FavoriteRepository) {
      setFavorites(emptyFavorites);
      setError('');
      return;
    }
    setIsLoading(true);
    try {
      const result = await FavoriteRepository.listByUser(user.id);
      if (result.ok) {
        setFavorites(result.data);
        setError('');
      } else {
        setError(result.message);
      }
    } catch {
      setError('Ocorreu um erro inesperado ao carregar os favoritos.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => { void reload(); }, [reload]);

  const favoriteIds = useMemo(() => kind ? favorites[kind].map((favorite) => favorite.problemId ?? favorite.solutionId).filter((id): id is string => Boolean(id)) : [], [favorites, kind]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback((id: string) => favoriteSet.has(id), [favoriteSet]);

  const setOptimistic = useCallback((targetKind: FavoriteKind, id: string, favorite: boolean) => {
    setFavorites((current) => {
      const exists = current[targetKind].some((item) => matchesFavoriteTarget(item, targetKind, id));
      if (favorite && exists) return current;
      if (!favorite && !exists) return current;
      const optimistic: Favorite = { id: `optimistic-${targetKind}-${id}`, userId: user?.id ?? '', problemId: targetKind === 'problems' ? id : null, solutionId: targetKind === 'solutions' ? id : null, createdAt: new Date().toISOString() };
      return { ...current, [targetKind]: favorite ? [optimistic, ...current[targetKind]] : current[targetKind].filter((item) => !matchesFavoriteTarget(item, targetKind, id)) };
    });
  }, [user?.id]);

  const addFavorite = useCallback(async (id: string, targetKind: FavoriteKind | undefined = kind) => {
    if (!targetKind) return { ok: false, message: 'Tipo de favorito não informado.' };
    if (!user || !isAuthenticated) return { ok: false, message: 'Entre ou crie uma conta para favoritar.' };
    if (!FavoriteRepository) return { ok: false, message: 'Não foi possível adicionar aos favoritos. Tente novamente.' };
    setOptimistic(targetKind, id, true);
    const result = await FavoriteRepository.add(user.id, { kind: targetKind, id });
    if (!result.ok) { setOptimistic(targetKind, id, false); setError(result.message); return result; }
    await reload();
    return result;
  }, [isAuthenticated, kind, reload, setOptimistic, user]);

  const removeFavorite = useCallback(async (id: string, targetKind: FavoriteKind | undefined = kind) => {
    if (!targetKind) return { ok: false, message: 'Tipo de favorito não informado.' };
    if (!user || !isAuthenticated) return { ok: false, message: 'Entre na sua conta para alterar favoritos.' };
    if (!FavoriteRepository) return { ok: false, message: 'Não foi possível remover dos favoritos. Tente novamente.' };
    const removedFavorite = favorites[targetKind].find((item) => matchesFavoriteTarget(item, targetKind, id));
    setOptimistic(targetKind, id, false);
    const result = await FavoriteRepository.remove(user.id, { kind: targetKind, id });
    if (!result.ok) {
      if (removedFavorite) {
        setFavorites((current) => current[targetKind].some((item) => matchesFavoriteTarget(item, targetKind, id)) ? current : { ...current, [targetKind]: [removedFavorite, ...current[targetKind]] });
      } else {
        await reload();
      }
      setError(result.message);
      return result;
    }
    await reload();
    return result;
  }, [favorites, isAuthenticated, kind, reload, setOptimistic, user]);

  const toggleFavorite = useCallback(async (id: string, targetKind: FavoriteKind | undefined = kind) => {
    if (!targetKind) return { ok: false, message: 'Tipo de favorito não informado.' };
    const key = `${targetKind}:${id}`;
    if (pending.current.has(key)) return { ok: false, message: 'Aguarde a alteração anterior.' };
    pending.current.add(key);
    try {
      return favorites[targetKind].some((item) => matchesFavoriteTarget(item, targetKind, id))
        ? await removeFavorite(id, targetKind)
        : await addFavorite(id, targetKind);
    } catch {
      await reload();
      const message = 'Ocorreu um erro inesperado ao alterar o favorito.';
      setError(message);
      return { ok: false, message };
    } finally {
      pending.current.delete(key);
    }
  }, [addFavorite, favorites, kind, reload, removeFavorite]);

  return { favorites, favoriteIds, isFavorite, addFavorite, removeFavorite, toggleFavorite, reload, isLoading, error };
}
