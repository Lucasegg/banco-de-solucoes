import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

export const supabaseClient: SupabaseClient | null = supabaseConfig.isConfigured
  ? createClient(supabaseConfig.url!, supabaseConfig.anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  : null;

export async function checkSupabaseHealth() {
  if (!supabaseConfig.isConfigured || !supabaseConfig.url || !supabaseConfig.anonKey) {
    return { ok: false, message: 'Supabase não configurado.' };
  }

  try {
    const response = await fetch(`${supabaseConfig.url.replace(/\/$/, '')}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
      },
    });

    if (!response.ok) return { ok: false, message: `Projeto respondeu com HTTP ${response.status}.` };
    return { ok: true, message: 'Projeto Supabase acessível via REST API.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Falha desconhecida.' };
  }
}
