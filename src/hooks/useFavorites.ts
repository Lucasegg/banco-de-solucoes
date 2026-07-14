import { useEffect, useMemo, useState } from 'react';

export type FavoriteKind = 'problems' | 'solutions';

const storageKeys: Record<FavoriteKind, string> = {
  problems: 'banco-de-solucoes.favoriteProblems',
  solutions: 'banco-de-solucoes.favoriteSolutions',
};

function readFavoriteIds(kind: FavoriteKind) {
  try {
    const rawValue = window.localStorage.getItem(storageKeys[kind]);
    if (!rawValue) return [];
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)));
  } catch {
    return [];
  }
}

function writeFavoriteIds(kind: FavoriteKind, ids: string[]) {
  try {
    window.localStorage.setItem(storageKeys[kind], JSON.stringify(ids));
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
