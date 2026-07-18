import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../lib/logger.ts';

export const EXPECTED_SCHEMA_VERSION = '26.0.0' as const;
export type CheckStatus = 'ok' | 'error';
export interface DiagnosticCheck { name: string; status: CheckStatus; message: string; latency_ms?: number }
export interface SystemHealth { ok: boolean; schema_version: string | null; checked_at: string; checks: DiagnosticCheck[] }

type HealthRow = { ok: boolean; schema_version: string | null; checked_at: string; checks: DiagnosticCheck[] };
type DiagnosticClient = Pick<SupabaseClient, 'rpc' | 'auth' | 'storage'>;
const failure = (name: string, message: string, latency_ms?: number): DiagnosticCheck => ({ name, status: 'error', message, ...(latency_ms === undefined ? {} : { latency_ms }) });
const elapsed = (start: number) => Math.max(0, Math.round(performance.now() - start));
const requiredDatabaseChecks = ['database', 'schema_version', 'required_rpcs', 'required_columns'];

function isCheck(value: unknown): value is DiagnosticCheck {
  if (!value || typeof value !== 'object') return false;
  const check = value as Record<string, unknown>;
  return typeof check.name === 'string' && (check.status === 'ok' || check.status === 'error') && typeof check.message === 'string' && (check.latency_ms === undefined || typeof check.latency_ms === 'number');
}

export function isHealthRow(value: unknown): value is HealthRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const checks = row.checks;
  return typeof row.ok === 'boolean' && (typeof row.schema_version === 'string' || row.schema_version === null) && typeof row.checked_at === 'string' && Array.isArray(checks) && checks.every(isCheck) && requiredDatabaseChecks.every((name) => checks.some((check: unknown) => isCheck(check) && check.name === name));
}

async function checkAuth(client: DiagnosticClient): Promise<DiagnosticCheck> {
  const start = performance.now();
  try {
    const { error } = await client.auth.getUser();
    if (error) throw error;
    return { name: 'auth', status: 'ok', message: 'Serviço de autenticação disponível.', latency_ms: elapsed(start) };
  } catch (error) {
    logger.error('Falha no check de autenticação', error, { operation: 'auth.getUser' });
    return failure('auth', 'Não foi possível validar o serviço de autenticação.', elapsed(start));
  }
}

async function checkStorage(client: DiagnosticClient): Promise<DiagnosticCheck> {
  const start = performance.now();
  try {
    const { error } = await client.storage.listBuckets();
    if (error) throw error;
    return { name: 'storage', status: 'ok', message: 'Serviço de armazenamento disponível.', latency_ms: elapsed(start) };
  } catch (error) {
    logger.error('Falha no check de armazenamento', error, { operation: 'storage.listBuckets' });
    return failure('storage', 'Não foi possível validar o serviço de armazenamento.', elapsed(start));
  }
}

export async function checkDatabaseHealth(client: DiagnosticClient | null): Promise<SystemHealth> {
  const startedAt = performance.now();
  const checked_at = new Date().toISOString();
  if (!client) return { ok: false, schema_version: null, checked_at, checks: [failure('database', 'Supabase não configurado.'), failure('schema_version', 'Não foi possível validar a versão do banco.'), failure('required_rpcs', 'Não foi possível validar as RPCs obrigatórias.'), failure('required_columns', 'Não foi possível validar as colunas obrigatórias.'), failure('auth', 'Não foi possível validar o serviço de autenticação.'), failure('storage', 'Não foi possível validar o serviço de armazenamento.')] };
  try {
    const rpcStart = performance.now();
    const [{ data, error }, auth, storage] = await Promise.all([client.rpc('get_system_health'), checkAuth(client), checkStorage(client)]);
    if (error) {
      logger.error('Falha no diagnóstico do banco', error, { operation: 'get_system_health', code: errorCode(error) });
      const total = elapsed(startedAt);
      return { ok: false, schema_version: null, checked_at, checks: [failure('database', 'Não foi possível concluir o diagnóstico do sistema.', elapsed(rpcStart)), failure('schema_version', 'Não foi possível validar a versão do banco.'), failure('required_rpcs', 'Não foi possível validar as RPCs obrigatórias.'), failure('required_columns', 'Não foi possível validar as colunas obrigatórias.'), auth, storage, failure('response_time', `Diagnóstico interrompido após ${total} ms.`, total)] };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!isHealthRow(row)) throw new Error('Malformed health RPC response');
    const checks = [...row.checks, auth, storage];
    if (row.schema_version !== EXPECTED_SCHEMA_VERSION) {
      const schema = checks.find((check) => check.name === 'schema_version');
      if (schema) Object.assign(schema, { status: 'error', message: 'Versão do banco incompatível com esta versão da aplicação.' });
    }
    const total = elapsed(startedAt);
    checks.push({ name: 'response_time', status: 'ok', message: `Diagnóstico concluído em ${total} ms.`, latency_ms: total });
    const rpcLatency = elapsed(rpcStart);
    const database = checks.find((check) => check.name === 'database');
    if (database?.latency_ms === undefined) database!.latency_ms = rpcLatency;
    return { ok: checks.every((check) => check.status === 'ok'), schema_version: row.schema_version, checked_at: row.checked_at, checks };
  } catch (error) {
    logger.error('Falha no diagnóstico do banco', error, { operation: 'get_system_health', code: errorCode(error) });
    const total = elapsed(startedAt);
    return { ok: false, schema_version: null, checked_at, checks: [failure('database', 'Não foi possível concluir o diagnóstico do sistema.', total), failure('schema_version', 'Não foi possível validar a versão do banco.'), failure('required_rpcs', 'Não foi possível validar as RPCs obrigatórias.'), failure('required_columns', 'Não foi possível validar as colunas obrigatórias.'), failure('auth', 'Não foi possível validar o serviço de autenticação.'), failure('storage', 'Não foi possível validar o serviço de armazenamento.'), failure('response_time', `Diagnóstico interrompido após ${total} ms.`, total)] };
  }
}

function errorCode(error: unknown) { return error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined; }
