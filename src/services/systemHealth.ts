import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../lib/logger.ts';

export type CheckStatus = 'ok' | 'error';
export interface DiagnosticCheck { name: string; status: CheckStatus; message: string }
export interface SystemHealth { ok: boolean; checkedAt: string; schemaVersion: string | null; checks: DiagnosticCheck[] }

type HealthRow = { ok?: boolean; schema_version?: string | null; checks?: DiagnosticCheck[] };

export async function checkDatabaseHealth(client: SupabaseClient | null): Promise<SystemHealth> {
  const checkedAt = new Date().toISOString();
  if (!client) return { ok: false, checkedAt, schemaVersion: null, checks: [{ name: 'configuration', status: 'error', message: 'Supabase não configurado.' }] };

  try {
    const { data, error } = await client.rpc('get_system_health');
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as HealthRow | null;
    const checks = Array.isArray(row?.checks) ? row.checks : [];
    return { ok: Boolean(row?.ok) && checks.every((check) => check.status === 'ok'), checkedAt, schemaVersion: row?.schema_version ?? null, checks };
  } catch (error) {
    logger.error('Falha no diagnóstico do banco', error, { operation: 'get_system_health' });
    return { ok: false, checkedAt, schemaVersion: null, checks: [{ name: 'health_rpc', status: 'error', message: error instanceof Error ? error.message : 'Falha desconhecida.' }] };
  }
}
