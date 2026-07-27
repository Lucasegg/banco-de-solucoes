import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import { safeDatabaseMessage } from '../errors';
import type { TaxonomyKind, TaxonomyProposal, TaxonomyProposalStatus, TaxonomyScope } from '../../types/taxonomy';
import { TaxonomyRepositoryCore } from './TaxonomyRepositoryCore';
const proposal=(row:Record<string,unknown>):TaxonomyProposal=>({id:String(row.id),proposedName:String(row.proposed_name),normalizedName:String(row.normalized_name),kind:row.kind as TaxonomyKind,scope:row.scope as TaxonomyScope,justification:String(row.justification),authorId:String(row.author_id),status:row.status as TaxonomyProposalStatus,reviewerId:row.reviewer_id?String(row.reviewer_id):null,decisionReason:row.decision_reason?String(row.decision_reason):null,createdAt:String(row.created_at),reviewedAt:row.reviewed_at?String(row.reviewed_at):null});
export class SupabaseTaxonomyRepository {
 private core:TaxonomyRepositoryCore;
 constructor(private client:SupabaseClient){this.core=new TaxonomyRepositoryCore(client as never)}
 async list(kind:TaxonomyKind,scope:TaxonomyScope,query='',offset=0){const result=await this.core.list(kind,scope,query,offset);return result.ok?result:{ok:false as const,message:safeDatabaseMessage(result.error,'Não foi possível carregar a taxonomia.')}}
 async propose(name:string,kind:TaxonomyKind,scope:TaxonomyScope,justification:string){const result=await this.core.propose(name,kind,scope,justification);return result.ok?result:{ok:false as const,message:safeDatabaseMessage(result.error,'Não foi possível enviar a sugestão.')}}
 async mine(){const {data,error}=await this.client.rpc('my_taxonomy_proposals',{p_limit:100,p_offset:0});return error?{ok:false as const,message:safeDatabaseMessage(error,'Não foi possível carregar suas sugestões.')}:{ok:true as const,data:(Array.isArray(data)?data:[]).map(proposal)}}
 async queue(){const {data,error}=await this.client.rpc('taxonomy_moderation_queue',{p_limit:100,p_offset:0});return error?{ok:false as const,message:safeDatabaseMessage(error,'Não foi possível carregar a fila.')}:{ok:true as const,data:(Array.isArray(data)?data:[]).map(proposal)}}
 async review(id:string,decision:'approved'|'rejected',reason=''){const {error}=await this.client.rpc('review_taxonomy_proposal',{p_proposal_id:id,p_decision:decision,p_reason:reason||null});return error?{ok:false as const,message:safeDatabaseMessage(error,'Não foi possível revisar a sugestão.')}:{ok:true as const}}
}
export const TaxonomyRepository=supabaseClient?new SupabaseTaxonomyRepository(supabaseClient):null;
