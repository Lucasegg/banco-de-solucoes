import { supabaseConfig } from './config';

type SupabaseSessionResult = { error?: { message?: string } | null };
type SupabaseClient = {
  auth: {
    getSession: () => Promise<SupabaseSessionResult>;
  };
};

type SupabaseModule = {
  createClient: (url: string, anonKey: string, options: { auth: { persistSession: boolean; autoRefreshToken: boolean } }) => SupabaseClient;
};

let cachedClient: SupabaseClient | null | undefined;

export async function getSupabaseClient() {
  if (!supabaseConfig.isConfigured) return null;
  if (cachedClient !== undefined) return cachedClient;

  const module = await import(/* @vite-ignore */ '@supabase/supabase-js') as SupabaseModule;
  cachedClient = module.createClient(supabaseConfig.url!, supabaseConfig.anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

export const supabaseClient = null;

export async function checkSupabaseHealth() {
  if (!supabaseConfig.isConfigured) return { ok: false, message: 'Supabase não configurado.' };

  try {
    const client = await getSupabaseClient();
    if (!client) return { ok: false, message: 'Cliente Supabase indisponível.' };
    const { error } = await client.auth.getSession();
    if (error) return { ok: false, message: error.message ?? 'Falha no health check.' };
    return { ok: true, message: 'Cliente Supabase respondeu.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Falha desconhecida.' };
  }
}
