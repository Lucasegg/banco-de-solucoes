import type { SupabaseClient } from '@supabase/supabase-js';
import { safeDatabaseMessage } from '../errors.ts';
import { contentReportReasons, contentReportStatuses, type ContentReport, type ContentReportReason, type ContentReportStatus, type ContentReportTarget } from '../../types/contentReport.ts';

type Result<T> = { ok: true; data: T } | { ok: false; message: string };
export type CreatedContentReport = Pick<ContentReport, 'id'|'targetType'|'targetId'|'reason'|'status'|'createdAt'>;
export type ModeratedContentReport = Pick<ContentReport, 'id'|'status'|'updatedAt'|'reviewedAt'>;
type Row = Record<string, unknown>;
const targets = new Set<ContentReportTarget>(['problem', 'solution']);
const reasons = new Set<ContentReportReason>(contentReportReasons);
const statuses = new Set<ContentReportStatus>(contentReportStatuses);
const INVALID_RESPONSE = 'O servidor retornou uma resposta de denúncia inválida.';

function requiredString(row: Row, key: string) { return typeof row[key] === 'string' && row[key] !== '' ? row[key] as string : null; }
function optionalString(row: Row, key: string): string | null | undefined { if (!(key in row)) return undefined; return row[key] === null ? null : requiredString(row, key) ?? undefined; }
function base(row: Row) {
  const id=requiredString(row,'id'),targetType=requiredString(row,'target_type'),targetId=requiredString(row,'target_id'),reason=requiredString(row,'reason'),status=requiredString(row,'status');
  if (!id || !targetId || !targets.has(targetType as ContentReportTarget) || !reasons.has(reason as ContentReportReason) || !statuses.has(status as ContentReportStatus)) return null;
  return { id, targetType:targetType as ContentReportTarget, targetId, reason:reason as ContentReportReason, status:status as ContentReportStatus };
}
export function parseCreatedContentReport(value: unknown): CreatedContentReport | null { if(!value||typeof value!=='object')return null;const row=value as Row,b=base(row),createdAt=requiredString(row,'created_at');return b&&createdAt?{...b,createdAt}:null; }
export function parseMyContentReport(value: unknown): ContentReport | null { if(!value||typeof value!=='object')return null;const row=value as Row,b=base(row),createdAt=requiredString(row,'created_at'),updatedAt=requiredString(row,'updated_at'),description=optionalString(row,'description');if(!b||!createdAt||!updatedAt||description===undefined)return null;return{...b,description,createdAt,updatedAt}; }
export function parseAdminContentReport(value: unknown): ContentReport | null { if(!value||typeof value!=='object')return null;const row=value as Row,b=base(row),createdAt=requiredString(row,'created_at'),updatedAt=requiredString(row,'updated_at'),description=optionalString(row,'description'),moderatorNote=optionalString(row,'moderator_note'),reviewedAt=optionalString(row,'reviewed_at'),targetTitle=optionalString(row,'target_title');const total=typeof row.total_count==='number'?row.total_count:typeof row.total_count==='string'&&/^\d+$/.test(row.total_count)?Number(row.total_count):null;if(!b||!createdAt||!updatedAt||description===undefined||moderatorNote===undefined||reviewedAt===undefined||targetTitle===undefined||total===null)return null;return{...b,description,moderatorNote,reviewedAt,targetTitle,createdAt,updatedAt,totalCount:total}; }
export function parseModeratedContentReport(value: unknown): ModeratedContentReport | null { if(!value||typeof value!=='object')return null;const row=value as Row,id=requiredString(row,'id'),status=requiredString(row,'status'),updatedAt=requiredString(row,'updated_at'),reviewedAt=optionalString(row,'reviewed_at');if(!id||!status||!statuses.has(status as ContentReportStatus)||!updatedAt||reviewedAt===undefined)return null;return{id,status:status as ContentReportStatus,updatedAt,reviewedAt}; }
function first(data: unknown) { return Array.isArray(data) && data.length===1 ? data[0] : null; }

export class SupabaseContentReportRepository {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client=client; }
  async create(targetType:ContentReportTarget,targetId:string,reason:ContentReportReason,description:string):Promise<Result<CreatedContentReport>> { const {data,error}=await this.client.rpc('report_content',{p_target_type:targetType,p_target_id:targetId,p_reason:reason,p_description:description.trim()||null});if(error)return{ok:false,message:safeDatabaseMessage(error,'Não foi possível enviar a denúncia.')};const parsed=parseCreatedContentReport(first(data));return parsed?{ok:true,data:parsed}:{ok:false,message:INVALID_RESPONSE}; }
  async listMine():Promise<Result<ContentReport[]>> { const {data,error}=await this.client.rpc('get_my_content_reports');if(error)return{ok:false,message:safeDatabaseMessage(error,'Não foi possível carregar suas denúncias.')};if(!Array.isArray(data))return{ok:false,message:INVALID_RESPONSE};const items=data.map(parseMyContentReport);return items.some(item=>!item)?{ok:false,message:INVALID_RESPONSE}:{ok:true,data:items as ContentReport[]}; }
  async listAdmin(filters:{status?:ContentReportStatus;targetType?:ContentReportTarget;reason?:ContentReportReason;page:number;limit:number}):Promise<Result<{items:ContentReport[];total:number}>> { const {data,error}=await this.client.rpc('get_admin_content_reports',{p_status:filters.status??null,p_target_type:filters.targetType??null,p_reason:filters.reason??null,p_limit:filters.limit,p_offset:filters.page*filters.limit});if(error)return{ok:false,message:safeDatabaseMessage(error,'Não foi possível carregar a fila de denúncias.')};if(!Array.isArray(data))return{ok:false,message:INVALID_RESPONSE};const items=data.map(parseAdminContentReport);if(items.some(item=>!item))return{ok:false,message:INVALID_RESPONSE};return{ok:true,data:{items:items as ContentReport[],total:items[0]?.totalCount??0}}; }
  async moderate(id:string,status:'reviewing'|'resolved'|'dismissed',note:string):Promise<Result<ModeratedContentReport>> { const {data,error}=await this.client.rpc('moderate_content_report',{p_report_id:id,p_status:status,p_moderator_note:note.trim()||null});if(error)return{ok:false,message:safeDatabaseMessage(error,'Não foi possível moderar a denúncia.')};const parsed=parseModeratedContentReport(first(data));return parsed?{ok:true,data:parsed}:{ok:false,message:INVALID_RESPONSE}; }
}
