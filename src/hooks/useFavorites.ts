import { useEffect, useMemo, useState } from 'react';
import { FavoriteRepository, type FavoriteKind } from '../repositories/favorites';

export type { FavoriteKind };

function readFavoriteIds(kind: FavoriteKind) {
  return FavoriteRepository.listIds(kind);
}

function writeFavoriteIds(kind: FavoriteKind, ids: string[]) {
  FavoriteRepository.saveIds(kind, ids);
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
