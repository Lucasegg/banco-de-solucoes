import { useEffect, useMemo, useState } from 'react';
import { localStorageAdapter } from '../storage/LocalStorageAdapter';

export type FavoriteKind = 'problems' | 'solutions';

const storageKeys: Record<FavoriteKind, string> = {
  problems: 'banco-de-solucoes.favoriteProblems',
  solutions: 'banco-de-solucoes.favoriteSolutions',
};

function readFavoriteIds(kind: FavoriteKind) {
  try {
    return Array.from(new Set(localStorageAdapter.list(storageKeys[kind], { validator: (item): item is string => typeof item === 'string' && item.trim().length > 0 })));
  } catch {
    return [];
  }
}

function writeFavoriteIds(kind: FavoriteKind, ids: string[]) {
  try {
    localStorageAdapter.set(storageKeys[kind], ids);
  } catch {
    // Favoritos são um aprimoramento local; a UI não deve quebrar se o armazenamento estiver indisponível.
  }
}

export function useFavorites(kind: FavoriteKind) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds(kind));

  useEffect(() => {
    setFavoriteIds(readFavoriteIds(kind));
  }, [kind]);

  useEffect(() => {
    writeFavoriteIds(kind, favoriteIds);
  }, [favoriteIds, kind]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = (id: string) => favoriteSet.has(id);
  const addFavorite = (id: string) => setFavoriteIds((current) => current.includes(id) ? current : [...current, id]);
  const removeFavorite = (id: string) => setFavoriteIds((current) => current.filter((item) => item !== id));
  const toggleFavorite = (id: string) => setFavoriteIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return { favoriteIds, isFavorite, addFavorite, removeFavorite, toggleFavorite };
}
