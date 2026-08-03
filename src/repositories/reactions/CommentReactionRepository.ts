import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { CommentReactionType, DiscussionTargetType } from '../../types/discussion';
import { COMMENT_REACTION_TYPES, emptyCommentReactionSummary, parseCommentReactionSummaries, type CommentReactionSummaries } from './commentReactionCore';
import type { RepositoryResult } from '../problems/ProblemRepository';

export { COMMENT_REACTION_TYPES, emptyCommentReactionSummary, parseCommentReactionSummaries };
export type { CommentReactionSummaries };
export class SupabaseCommentReactionRepository {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }
  async summary(targetType: DiscussionTargetType, targetId: string): Promise<RepositoryResult<CommentReactionSummaries>> {
    const { data, error } = await this.client.rpc('get_comment_reaction_summary', { p_problem_id: targetType === 'problem' ? targetId : null, p_solution_id: targetType === 'solution' ? targetId : null });
    return error ? { ok: false, message: 'Não foi possível carregar as reações.' } : parseCommentReactionSummaries(data);
  }
  async toggle(commentId: string, reactionType: CommentReactionType): Promise<RepositoryResult<{ active: boolean; count: number }>> {
    if (!COMMENT_REACTION_TYPES.includes(reactionType)) return { ok: false, message: 'Tipo de reação inválido.' };
    const { data, error } = await this.client.rpc('toggle_my_comment_reaction', { p_comment_id: commentId, p_reaction_type: reactionType });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row || typeof row.active !== 'boolean' || typeof row.reaction_count !== 'number') return { ok: false, message: error ? 'Não foi possível atualizar a reação.' : 'Não foi possível interpretar a reação.' };
    return { ok: true, data: { active: row.active, count: row.reaction_count } };
  }
}
export const CommentReactionRepository = supabaseClient ? new SupabaseCommentReactionRepository(supabaseClient) : null;
