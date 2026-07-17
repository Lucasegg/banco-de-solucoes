import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { AdminUser, AuditEvent, AuditFilters } from '../../types/audit';
import { safeDatabaseMessage } from '../errors';
type Result<T> = { ok: true; data: T } | { ok: false; message: string };
export class SupabaseAuditRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(f: AuditFilters): Promise<Result<AuditEvent[]>> { const { data, error } = await this.client.rpc('get_audit_events', { p_event_type:f.eventType||null,p_target_type:f.targetType||null,p_actor_id:f.actorId||null,p_from:f.from||null,p_to:f.to?`${f.to}T23:59:59.999Z`:null,p_search:f.search||null,p_ascending:f.ascending,p_limit:50,p_offset:f.page*50 }); if(error)return {ok:false,message:safeDatabaseMessage(error,'Não foi possível carregar a auditoria.')}; return {ok:true,data:(data??[]).map((r:Record<string,unknown>)=>({id:String(r.id),actorId:r.actor_id?String(r.actor_id):null,actorName:String(r.actor_name??'Sistema'),eventType:String(r.event_type),targetType:r.target_type?String(r.target_type):null,targetId:r.target_id?String(r.target_id):null,metadata:r.metadata&&typeof r.metadata==='object'&&!Array.isArray(r.metadata)?r.metadata as Record<string,unknown>:{},createdAt:String(r.created_at)}))}; }
  async listUsers():Promise<Result<AdminUser[]>>{const{data,error}=await this.client.rpc('get_admin_users');if(error)return{ok:false,message:safeDatabaseMessage(error)};return{ok:true,data:(data??[]).map((r:Record<string,unknown>)=>({id:String(r.id),name:String(r.display_name||r.username||'Usuário'),role:r.role as AdminUser['role']}))};}
  async updateRole(id:string,role:AdminUser['role']):Promise<Result<null>>{const{error}=await this.client.rpc('update_user_role',{p_user_id:id,p_role:role});return error?{ok:false,message:safeDatabaseMessage(error,'Não foi possível alterar o papel.')}:{ok:true,data:null};}
}
export const AuditRepository=supabaseClient?new SupabaseAuditRepository(supabaseClient):null;
