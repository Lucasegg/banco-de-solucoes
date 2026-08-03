import { supabaseClient } from '../../lib/supabase';
import { PublicProfileRepository } from './PublicProfileRepository';
export const publicProfileRepository=supabaseClient?new PublicProfileRepository(supabaseClient):null;
export * from './PublicProfileRepository'; export * from './publicProfileCore';
