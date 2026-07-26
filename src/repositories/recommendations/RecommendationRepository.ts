import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import { safeDatabaseMessage } from '../errors';

export type Recommendation = { id:string; title:string; summary:string; category:string; tags:string[]; city?:string; state?:string; location?:string; recommendation_score:number; recommendation_reasons:string[]; total_count:number };
export type RecommendationPage = { items:Recommendation[]; total:number };
const rows=(data:unknown):Recommendation[]=>Array.isArray(data)?data.filter((x):x is Recommendation=>Boolean(x)&&typeof x==='object'&&typeof (x as Recommendation).id==='string').map(x=>({...x,tags:Array.isArray(x.tags)?x.tags:[],recommendation_reasons:Array.isArray(x.recommendation_reasons)?x.recommendation_reasons:[],recommendation_score:Number(x.recommendation_score)||0,total_count:Number(x.total_count)||0})):[];
export class SupabaseRecommendationRepository {
 constructor(private client:SupabaseClient){}
 private async call(name:string,idName:string,id:string,offset:number){const {data,error}=await this.client.rpc(name,{[idName]:id,p_limit:6,p_offset:Math.max(0,offset)});if(error)return {ok:false as const,message:safeDatabaseMessage(error,'Não foi possível carregar as recomendações.')};const items=rows(data);return {ok:true as const,data:{items,total:items[0]?.total_count??0}};}
 relatedProblems(id:string,offset=0){return this.call('get_related_problems','p_problem_id',id,offset)}
 recommendedSolutions(id:string,offset=0){return this.call('get_recommended_solutions','p_problem_id',id,offset)}
 relatedProblemsForSolution(id:string,offset=0){return this.call('get_related_problems_for_solution','p_solution_id',id,offset)}
}
export const RecommendationRepository=supabaseClient?new SupabaseRecommendationRepository(supabaseClient):null;
