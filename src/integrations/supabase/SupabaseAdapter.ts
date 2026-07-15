import type { StorageAdapter, StorageListOptions, StorageReadOptions, StorageTransactionOperation } from '../../storage/StorageAdapter';
import { supabaseClient } from './client';

function reportNotImplemented(method: string) {
  console.info(`[SupabaseAdapter] ${method} ainda não implementado. LocalStorageAdapter segue ativo.`);
}

export class SupabaseAdapter implements StorageAdapter {
  readonly client = supabaseClient;

  get<T>(_key: string, options: StorageReadOptions<T>): T {
    reportNotImplemented('get');
    return options.fallback;
  }

  set<T>(_key: string, _value: T): boolean {
    reportNotImplemented('set');
    return false;
  }

  remove(_key: string): boolean {
    reportNotImplemented('remove');
    return false;
  }

  list<T>(_key: string, _options: StorageListOptions<T>): T[] {
    reportNotImplemented('list');
    return [];
  }

  transaction(_operations: StorageTransactionOperation[]): boolean {
    reportNotImplemented('transaction');
    return false;
  }

  clear(_keys?: string[]): boolean {
    reportNotImplemented('clear');
    return false;
  }

  has(_key: string): boolean {
    reportNotImplemented('has');
    return false;
  }
}

export const supabaseAdapter = new SupabaseAdapter();
