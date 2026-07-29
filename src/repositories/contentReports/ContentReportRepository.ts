import { supabaseClient } from '../../integrations/supabase/client';
import { SupabaseContentReportRepository } from './ContentReportRepositoryCore';
export * from './ContentReportRepositoryCore';
export const ContentReportRepository=supabaseClient?new SupabaseContentReportRepository(supabaseClient):null;
