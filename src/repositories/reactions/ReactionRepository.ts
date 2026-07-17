import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { ReactionCounts, ReactionState, ReactionType } from '../../types/discussion';
import type { RepositoryResult } from '../problems/ProblemRepository';

export type ReactionTarget = { kind: 'problem'; id: string } | { kind: 'solution'; id: string };
type SummaryRow = { reaction_type: unknown; reaction_count: unknown; selected_by_user: unknown };
const emptyCounts = (): ReactionCounts => ({ useful: 0, liked: 0, interesting: 0 });
const isReactionType = (value: unknown): value is ReactionType => value === 'useful' || value === 'liked' || value === 'interesting';
const errorMessage = (error: unknown, fallback: string) => error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback;

export class SupabaseReactionRepository {
  constructor(private readonly client: SupabaseClient) {}
  async summary(target: ReactionTarget): Promise<RepositoryResult<ReactionState>> {
    const { data, error } = await this.client.rpc('get_reaction_summary', { p_problem_id: target.kind === 'problem' ? target.id : null, p_solution_id: target.kind === 'solution' ? target.id : null });
    if (error) return { ok: false, message: errorMessage(error, 'Não foi possível carregar as reações.') };
    const counts = emptyCounts(); const selected: ReactionType[] = [];
    for (const value of (data ?? []) as SummaryRow[]) {
      if (!isReactionType(value.reaction_type) || typeof value.reaction_count !== 'number' || typeof value.selected_by_user !== 'boolean') return { ok: false, message: 'Supabase retornou reações em formato inválido.' };
      counts[value.reaction_type] = value.reaction_count; if (value.selected_by_user) selected.push(value.reaction_type);
    }
    return { ok: true, data: { counts, selected } };
  }
  async add(target: ReactionTarget, reactionType: ReactionType): Promise<RepositoryResult<null>> {
    const { error } = await this.client.from('reactions').insert({ problem_id: target.kind === 'problem' ? target.id : null, solution_id: target.kind === 'solution' ? target.id : null, reaction_type: reactionType });
    return error ? { ok: false, message: errorMessage(error, 'Não foi possível adicionar a reação.') } : { ok: true, data: null };
  }
  async remove(target: ReactionTarget, reactionType: ReactionType): Promise<RepositoryResult<null>> {
    let query = this.client.from('reactions').delete().eq('reaction_type', reactionType);
    query = target.kind === 'problem' ? query.eq('problem_id', target.id) : query.eq('solution_id', target.id);
    const { error } = await query;
    return error ? { ok: false, message: errorMessage(error, 'Não foi possível remover a reação.') } : { ok: true, data: null };
  }
}
export const ReactionRepository = supabaseClient ? new SupabaseReactionRepository(supabaseClient) : null;
