import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import { localStorageAdapter } from '../../storage/LocalStorageAdapter';
import type { MapBounds, MapFilters, MapProblem, ProblemRegionSummary } from '../../types/map';
import type { Problem, ProblemCategory, ProblemStatus } from '../../types/domain';

type Result<T> = { ok: true; data: T } | { ok: false; message: string };
const message = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Não foi possível carregar o mapa.';
const inBounds = (p: MapProblem,b: MapBounds) => p.location.latitude<=b.north&&p.location.latitude>=b.south&&(b.west<=b.east?p.location.longitude>=b.west&&p.location.longitude<=b.east:p.location.longitude>=b.west||p.location.longitude<=b.east);
const filter = (p: MapProblem,f: MapFilters) => (!f.status||p.status===f.status)&&(!f.category||p.category===f.category)&&(!f.state||p.state.toLocaleLowerCase()===f.state.trim().toLocaleLowerCase())&&(!f.city||p.city.toLocaleLowerCase()===f.city.trim().toLocaleLowerCase())&&(!f.neighborhood||(p.neighborhood||'').toLocaleLowerCase()===f.neighborhood.trim().toLocaleLowerCase())&&(!f.verifiedOnly||p.verified)&&(!f.recentlyUpdatedOnly||Date.now()-Date.parse(p.updatedAt)<=30*86400000);
const precisions = ['exact','street','neighborhood','city','state'] as const;
const isLocalProblem = (value: unknown): value is Problem => Boolean(value && typeof value === 'object' && 'id' in value && 'title' in value);
const toMapProblem = (problem: Problem): MapProblem | null => {
  if (typeof problem.latitude !== 'number' || !Number.isFinite(problem.latitude) || problem.latitude < -90 || problem.latitude > 90 || typeof problem.longitude !== 'number' || !Number.isFinite(problem.longitude) || problem.longitude < -180 || problem.longitude > 180 || !problem.geolocationPrecision || !precisions.includes(problem.geolocationPrecision)) return null;
  return { id: problem.id, title: problem.title, category: problem.category as ProblemCategory, status: problem.status as ProblemStatus, city: problem.city, state: problem.state, neighborhood: problem.neighborhood, location: { latitude: problem.latitude, longitude: problem.longitude, precision: problem.geolocationPrecision, source: problem.geolocationSource }, updatedAt: problem.geocodedAt ?? problem.createdAt, verified: Boolean(problem.sourceVerifiedAt) };
};
const localMapProblems = () => localStorageAdapter.list<Problem>('problems', { validator: isLocalProblem }).map(toMapProblem).filter((problem): problem is MapProblem => problem !== null);

export class MapRepository {
  constructor(private readonly client: SupabaseClient|null=supabaseClient) {}
  async getProblemsInBounds(bounds: MapBounds,filters: MapFilters={}): Promise<Result<MapProblem[]>> {
    if(!this.client) return {ok:true,data:localMapProblems().filter(p=>inBounds(p,bounds)&&filter(p,filters)).slice(0,200)};
    const {data,error}=await this.client.rpc('get_problems_in_bounds',{north:bounds.north,south:bounds.south,east:bounds.east,west:bounds.west,p_status:filters.status||null,p_category:filters.category||null,p_state:filters.state||null,p_city:filters.city||null,p_neighborhood:filters.neighborhood||null,verified_only:Boolean(filters.verifiedOnly),recently_updated_only:Boolean(filters.recentlyUpdatedOnly),p_limit:200});
    if(error)return {ok:false,message:message(error)};
    return {ok:true,data:(data||[]).map((r:Record<string,unknown>)=>({id:String(r.id),title:String(r.title),category:r.category,status:r.status,city:String(r.city),state:String(r.state),neighborhood:r.neighborhood?String(r.neighborhood):undefined,location:{latitude:Number(r.latitude),longitude:Number(r.longitude),precision:r.geolocation_precision},updatedAt:String(r.updated_at),verified:Boolean(r.source_verified_at)} as MapProblem))};
  }
  async getRegionSummary(): Promise<Result<ProblemRegionSummary[]>> { if(!this.client)return {ok:true,data:[]}; const {data,error}=await this.client.rpc('get_problem_region_summary'); if(error)return {ok:false,message:message(error)}; return {ok:true,data:(data||[]).map((r:Record<string,unknown>)=>({state:String(r.state),city:String(r.city),totalProblems:Number(r.total_problems),inProgress:Number(r.in_progress),resolved:Number(r.resolved),lastUpdated:String(r.last_updated)}))}; }
  async getProblemLocation(id:string):Promise<Result<MapProblem|null>> { if(!this.client)return {ok:true,data:localMapProblems().find(p=>p.id===id)||null}; const {data,error}=await this.client.rpc('get_public_problem_location',{p_problem_id:id});if(error)return {ok:false,message:message(error)};const row=data?.[0];if(!row)return {ok:true,data:null};return {ok:true,data:{id:row.id,title:row.title,category:row.category,status:row.status,city:row.city,state:row.state,location:{latitude:row.latitude,longitude:row.longitude,precision:row.geolocation_precision},updatedAt:row.updated_at,verified:Boolean(row.source_verified_at)} as MapProblem}; }
}
export const mapRepository=new MapRepository();
