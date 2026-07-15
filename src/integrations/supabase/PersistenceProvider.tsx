import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { localStorageAdapter } from '../../storage/LocalStorageAdapter';
import type { StorageAdapter } from '../../storage/StorageAdapter';
import { supabaseAdapter, type AsyncSupabaseAdapter } from './SupabaseAdapter';

export type PersistenceMode = 'local';

export interface PersistenceContextValue {
  activeAdapter: StorageAdapter;
  activeAdapterName: 'LocalStorageAdapter';
  mode: PersistenceMode;
  futureSupabaseAdapter: AsyncSupabaseAdapter;
}

const PersistenceContext = createContext<PersistenceContextValue | undefined>(undefined);

export function PersistenceProvider({ children }: { children: ReactNode }) {
  const value = useMemo<PersistenceContextValue>(() => ({
    activeAdapter: localStorageAdapter,
    activeAdapterName: 'LocalStorageAdapter',
    mode: 'local',
    futureSupabaseAdapter: supabaseAdapter,
  }), []);

  return <PersistenceContext.Provider value={value}>{children}</PersistenceContext.Provider>;
}

export function usePersistence() {
  const context = useContext<PersistenceContextValue | undefined>(PersistenceContext);
  if (!context) throw new Error('usePersistence deve ser usado dentro de PersistenceProvider.');
  return context;
}
