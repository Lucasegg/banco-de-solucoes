import type { TaxonomyKind, TaxonomyScope, TaxonomyTerm } from '../../types/taxonomy.ts';
export type TaxonomyRpcClient={rpc:(name:string,params:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}>};
export class TaxonomyRepositoryCore{
 protected client:TaxonomyRpcClient;
 constructor(client:TaxonomyRpcClient){this.client=client}
 async list(kind:TaxonomyKind,scope:TaxonomyScope,query='',offset=0){const {data,error}=await this.client.rpc('list_taxonomy_terms',{p_kind:kind,p_scope:scope,p_query:query,p_limit:100,p_offset:offset});if(error)return {ok:false as const,error};const items:TaxonomyTerm[]=Array.isArray(data)?data.map((r:Record<string,unknown>)=>({id:String(r.id),kind:r.kind as TaxonomyKind,scope:r.scope as TaxonomyScope,name:String(r.name),slug:String(r.slug),totalCount:Number(r.total_count)})):[];return {ok:true as const,data:{items,total:items[0]?.totalCount??0}}}
 async propose(name:string,kind:TaxonomyKind,scope:TaxonomyScope,justification:string){const {data,error}=await this.client.rpc('submit_taxonomy_proposal',{p_name:name,p_kind:kind,p_scope:scope,p_justification:justification});return error?{ok:false as const,error}:{ok:true as const,id:String(data)}}
}
