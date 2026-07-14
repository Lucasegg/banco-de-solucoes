export interface SupabaseRuntimeConfig {
  url?: string;
  anonKey?: string;
  isConfigured: boolean;
}

export const supabaseConfig: SupabaseRuntimeConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  isConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
};
