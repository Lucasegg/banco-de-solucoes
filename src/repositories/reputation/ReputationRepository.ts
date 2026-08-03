import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { UserReputation } from '../../types/discussion';
import type { RepositoryResult } from '../problems/ProblemRepository';

export { parseReputations } from './reputationCore';
import { parseReputations } from './reputationCore';
export class SupabaseReputationRepository{private readonly client:SupabaseClient;constructor(client:SupabaseClient){this.client=client}async listByUserIds(userIds:string[]):Promise<RepositoryResult<UserReputation[]>>{const unique=[...new Set(userIds)].slice(0,100);if(!unique.length)return{ok:true,data:[]};const{data,error}=await this.client.rpc('get_public_reputations',{p_user_ids:unique});return error?{ok:false,message:'Não foi possível carregar a reputação.'}:parseReputations(data)}}
export const ReputationRepository=supabaseClient?new SupabaseReputationRepository(supabaseClient):null;
