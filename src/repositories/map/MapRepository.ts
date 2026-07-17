import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import { localStorageAdapter } from '../../storage/LocalStorageAdapter';
import type { MapBounds, MapFilters, MapProblem, ProblemRegionSummary } from '../../types/map';

type Result<T> = { ok: true; data: T } | { ok: false; message: string };
const message = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Não foi possível carregar o mapa.';
const inBounds = (p: MapProblem,b: MapBounds) => p.location.latitude<=b.north&&p.location.latitude>=b.south&&(b.west<=b.east?p.location.longitude>=b.west&&p.location.longitude<=b.east:p.location.longitude>=b.west||p.location.longitude<=b.east);
const filter = (p: MapProblem,f: MapFilters) => (!f.status||p.status===f.status)&&(!f.category||p.category===f.category)&&(!f.state||p.state.toLocaleLowerCase()===f.state.trim().toLocaleLowerCase())&&(!f.city||p.city.toLocaleLowerCase()===f.city.trim().toLocaleLowerCase())&&(!f.neighborhood||(p.neighborhood||'').toLocaleLowerCase()===f.neighborhood.trim().toLocaleLowerCase())&&(!f.verifiedOnly||p.verified)&&(!f.recentlyUpdatedOnly||Date.now()-Date.parse(p.updatedAt)<=30*86400000);

export class MapRepository {
  constructor(private readonly client: SupabaseClient|null=supabaseClient) {}
  async getProblemsInBounds(bounds: MapBounds,filters: MapFilters={}): Promise<Result<MapProblem[]>> {
    if(!this.client){ const rows=localStorageAdapter.list<MapProblem>('mapProblems',{validator:(v):v is MapProblem=>Boolean(v&&typeof v==='object'&&'location' in v)}); return {ok:true,data:rows.filter(p=>inBounds(p,bounds)&&filter(p,filters)).slice(0,200)}; }
    const {data,error}=await this.client.rpc('get_problems_in_bounds',{north:bounds.north,south:bounds.south,east:bounds.east,west:bounds.west,p_status:filters.status||null,p_category:filters.category||null,p_state:filters.state||null,p_city:filters.city||null,p_neighborhood:filters.neighborhood||null,verified_only:Boolean(filters.verifiedOnly),recently_updated_only:Boolean(filters.recentlyUpdatedOnly),p_limit:200});
    if(error)return {ok:false,message:message(error)};
    return {ok:true,data:(data||[]).map((r:Record<string,unknown>)=>({id:String(r.id),title:String(r.title),category:r.category,status:r.status,city:String(r.city),state:String(r.state),neighborhood:r.neighborhood?String(r.neighborhood):undefined,location:{latitude:Number(r.latitude),longitude:Number(r.longitude),precision:r.geolocation_precision},updatedAt:String(r.updated_at),verified:Boolean(r.source_verified_at)} as MapProblem))};
  }
  async getRegionSummary(): Promise<Result<ProblemRegionSummary[]>> { if(!this.client)return {ok:true,data:[]}; const {data,error}=await this.client.rpc('get_problem_region_summary'); if(error)return {ok:false,message:message(error)}; return {ok:true,data:(data||[]).map((r:Record<string,unknown>)=>({state:String(r.state),city:String(r.city),totalProblems:Number(r.total_problems),inProgress:Number(r.in_progress),resolved:Number(r.resolved),lastUpdated:String(r.last_updated)}))}; }
  async getProblemLocation(id:string):Promise<Result<MapProblem|null>> { if(!this.client){const rows=localStorageAdapter.list<MapProblem>('mapProblems',{validator:(v):v is MapProblem=>Boolean(v&&typeof v==='object'&&'location' in v)});return {ok:true,data:rows.find(p=>p.id===id)||null};} const {data,error}=await this.client.from('problems').select('id,title,category,status,city,state,latitude,longitude,geolocation_precision,updated_at,source_verified_at').eq('id',id).maybeSingle();if(error)return {ok:false,message:message(error)};if(!data||data.latitude===null||data.longitude===null||!data.geolocation_precision)return {ok:true,data:null};return {ok:true,data:{id:data.id,title:data.title,category:data.category,status:data.status,city:data.city,state:data.state,location:{latitude:data.latitude,longitude:data.longitude,precision:data.geolocation_precision},updatedAt:data.updated_at,verified:Boolean(data.source_verified_at)} as MapProblem}; }
}
export const mapRepository=new MapRepository();
