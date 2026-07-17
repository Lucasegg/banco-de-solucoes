import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { ProblemStatus, ProblemTimelineEvent, ProblemTimelineType } from '../../types/problemTimeline';
import type { RepositoryResult } from '../problems/ProblemRepository';

type TimelineRow = { id:string; event_type:string; title:string; description:string|null; official:boolean; organization_name:string|null; status_before:string|null; status_after:string|null; actor_name:string; created_at:string };
const message = (error: unknown) => error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Não foi possível acessar a linha do tempo.';

export class SupabaseProblemTimelineRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(problemId: string): Promise<RepositoryResult<ProblemTimelineEvent[]>> {
    const { data, error } = await this.client.rpc('get_problem_timeline', { p_problem_id: problemId });
    if (error) return { ok: false, message: message(error) };
    return { ok: true, data: ((data ?? []) as TimelineRow[]).map((row) => ({ id:row.id,eventType:row.event_type as ProblemTimelineType,title:row.title,description:row.description,official:row.official,organizationName:row.organization_name,statusBefore:row.status_before,statusAfter:row.status_after,actorName:row.actor_name,createdAt:row.created_at })) };
  }
  async publishOfficialUpdate(problemId:string,title:string,description:string,status?:ProblemStatus):Promise<RepositoryResult<string>> {
    const { data,error }=await this.client.rpc('publish_problem_update',{p_problem_id:problemId,p_title:title,p_description:description,p_status:status??null});
    return error?{ok:false,message:message(error)}:{ok:true,data:data as string};
  }
}

export const ProblemTimelineRepository = supabaseClient ? new SupabaseProblemTimelineRepository(supabaseClient) : null;
