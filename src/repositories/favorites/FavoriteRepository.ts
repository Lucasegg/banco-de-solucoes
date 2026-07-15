import { localStorageAdapter } from '../../storage/LocalStorageAdapter';

export type FavoriteKind = 'problems' | 'solutions';

const storageKeys: Record<FavoriteKind, string> = {
  problems: 'banco-de-solucoes.favoriteProblems',
  solutions: 'banco-de-solucoes.favoriteSolutions',
};

function isFavoriteId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export const FavoriteRepository = {
  keys: storageKeys,
  listIds: (kind: FavoriteKind) => Array.from(new Set(localStorageAdapter.list(storageKeys[kind], { validator: isFavoriteId }))),
  saveIds: (kind: FavoriteKind, ids: string[]) => localStorageAdapter.set(storageKeys[kind], Array.from(new Set(ids.filter(isFavoriteId)))),
};
