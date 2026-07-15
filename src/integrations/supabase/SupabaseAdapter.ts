import { supabaseClient } from './client';

export type SupabaseTransactionOperation =
  | { type: 'set'; table: string; value: unknown }
  | { type: 'remove'; table: string; filters: Record<string, unknown> };

export interface AsyncSupabaseAdapter {
  get<T>(table: string, id: string): Promise<T | null>;
  set<T>(table: string, value: T): Promise<boolean>;
  remove(table: string, id: string): Promise<boolean>;
  list<T>(table: string): Promise<T[]>;
  transaction(operations: SupabaseTransactionOperation[]): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

/**
 * Adapter assíncrono preparado para uma migração futura.
 *
 * Ele NÃO substitui o StorageAdapter síncrono atual nesta sprint. O provider
 * mantém o LocalStorageAdapter ativo porque chamadas Supabase dependem de rede
 * e devem ser integradas com uma API assíncrona em uma migração dedicada.
 */
export class SupabaseAdapter implements AsyncSupabaseAdapter {
  readonly client = supabaseClient;

  async get<T>(_table: string, _id: string): Promise<T | null> {
    return Promise.reject(new Error('SupabaseAdapter.get ainda não implementado.'));
  }

  async set<T>(_table: string, _value: T): Promise<boolean> {
    return Promise.reject(new Error('SupabaseAdapter.set ainda não implementado.'));
  }

  async remove(_table: string, _id: string): Promise<boolean> {
    return Promise.reject(new Error('SupabaseAdapter.remove ainda não implementado.'));
  }

  async list<T>(_table: string): Promise<T[]> {
    return Promise.reject(new Error('SupabaseAdapter.list ainda não implementado.'));
  }

  async transaction(_operations: SupabaseTransactionOperation[]): Promise<boolean> {
    return Promise.reject(new Error('SupabaseAdapter.transaction exige desenho transacional específico por domínio.'));
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.client);
  }
}

export const supabaseAdapter = new SupabaseAdapter();
