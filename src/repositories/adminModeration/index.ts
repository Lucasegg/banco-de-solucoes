import { supabaseClient } from '../../integrations/supabase/client';
import { SupabaseAdminModerationRepository } from './AdminModerationRepositoryCore';
export const AdminModerationRepository=supabaseClient?new SupabaseAdminModerationRepository(supabaseClient):null;
export * from './AdminModerationRepositoryCore';
