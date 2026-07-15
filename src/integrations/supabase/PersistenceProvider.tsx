import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { localStorageAdapter } from '../../storage/LocalStorageAdapter';
import type { StorageAdapter } from '../../storage/StorageAdapter';
import { supabaseAdapter } from './SupabaseAdapter';

export type PersistenceMode = 'local' | 'supabase';

export interface PersistenceContextValue {
  activeAdapter: StorageAdapter;
  activeAdapterName: 'LocalStorageAdapter' | 'SupabaseAdapter';
  mode: PersistenceMode;
  availableAdapters: {
    local: StorageAdapter;
    supabase: StorageAdapter;
  };
}

const PersistenceContext = createContext<PersistenceContextValue | undefined>(undefined);

export function PersistenceProvider({ children }: { children: ReactNode }) {
  const value = useMemo<PersistenceContextValue>(() => ({
    activeAdapter: localStorageAdapter,
    activeAdapterName: 'LocalStorageAdapter',
    mode: 'local',
    availableAdapters: {
      local: localStorageAdapter,
      supabase: supabaseAdapter,
    },
  }), []);

  return <PersistenceContext.Provider value={value}>{children}</PersistenceContext.Provider>;
}

export function usePersistence() {
  const context = useContext<PersistenceContextValue | undefined>(PersistenceContext);
  if (!context) throw new Error('usePersistence deve ser usado dentro de PersistenceProvider.');
  return context;
}
