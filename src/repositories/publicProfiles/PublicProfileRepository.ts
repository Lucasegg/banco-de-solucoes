import type { SupabaseClient } from '@supabase/supabase-js';
import { parsePublicMemberProfile, type PublicProfilePayload } from './publicProfileCore';
export class PublicProfileRepository {
  constructor(private client: SupabaseClient) {}
  async getByUsername(username:string, signal?:AbortSignal):Promise<PublicProfilePayload> {
    if(signal?.aborted) throw new DOMException('Aborted','AbortError');
    const {data,error}=await this.client.rpc('get_public_member_profile',{p_username:username.trim().toLowerCase()});
    if(signal?.aborted) throw new DOMException('Aborted','AbortError');
    if(error) throw new Error('public-profile-unavailable');
    const parsed=parsePublicMemberProfile(data); if(!parsed.ok) throw new Error('public-profile-invalid'); return parsed.data;
  }
}
