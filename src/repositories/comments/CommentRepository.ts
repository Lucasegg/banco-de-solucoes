import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { RepositoryResult } from '../problems/ProblemRepository';
import type { ContentVisibility } from '../../types/moderation';
import type { Comment as DiscussionComment, CommentReport, Reaction } from '../../types/discussion';

export interface Comment {
  id: string;
  parentId: string | null;
  targetType: 'problem' | 'solution';
  targetId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  problemId: string | null;
  solutionId: string | null;
  content: string;
  edited: boolean;
  deleted: boolean;
  visibility: ContentVisibility;
  bestAnswer: boolean;
  reports: CommentReport[];
  createdAt: string;
  updatedAt: string;
}

export type CommentInput = { authorId: string; content: string; parentId?: string | null } & ({ problemId: string; solutionId?: never } | { solutionId: string; problemId?: never });
export type CommentUpdateInput = Pick<Comment, 'content'>;

type ProfileRow = { display_name: string | null; username: string | null; avatar_url: string | null };
export type CommentRow = {
  id: string;
  author_id: string;
  parent_id: string | null;
  problem_id: string | null;
  solution_id: string | null;
  content: string;
  edited: boolean;
  deleted: boolean;
  visibility: string;
  best_answer: boolean;
  reports?: CommentReport[];
  created_at: string;
  updated_at: string;
  profiles?: ProfileRow | ProfileRow[] | null;
};

const selectColumns = 'id,author_id,parent_id,problem_id,solution_id,content,edited,deleted,visibility,best_answer,created_at,updated_at,profiles(display_name,username,avatar_url)';

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === 'string'; }
function errorMessage(error: unknown, fallback: string) { return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback; }
function parseProfile(value: unknown): ProfileRow | null {
  const item = Array.isArray(value) ? value[0] : value;
  if (!isRecord(item)) return null;
  return { display_name: isString(item.display_name) ? item.display_name : null, username: isString(item.username) ? item.username : null, avatar_url: isString(item.avatar_url) ? item.avatar_url : null };
}
function parseReports(value: unknown): CommentReport[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  return value.every(isCommentReport) ? value : null;
}
export function parseCommentRow(value: unknown): CommentRow | null {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.author_id) || !isString(value.content) || typeof value.edited !== 'boolean' || typeof value.deleted !== 'boolean' || typeof value.best_answer !== 'boolean' || !isString(value.created_at) || !isString(value.updated_at)) return null;
  const reports = parseReports(value.reports);
  if (!reports) return null;
  const problemId = isString(value.problem_id) ? value.problem_id : null;
  const solutionId = isString(value.solution_id) ? value.solution_id : null;
  if ((problemId && solutionId) || (!problemId && !solutionId)) return null;
  return { id: value.id, author_id: value.author_id, parent_id: isString(value.parent_id) ? value.parent_id : null, problem_id: problemId, solution_id: solutionId, content: value.content, edited: value.edited, deleted: value.deleted, visibility: isContentVisibility(value.visibility) ? value.visibility : 'visible', best_answer: value.best_answer, reports, created_at: value.created_at, updated_at: value.updated_at, profiles: parseProfile(value.profiles) };
}
export function mapCommentRowToDomain(row: CommentRow): Comment {
  const profile = parseProfile(row.profiles) ?? parseProfile(row);
  const targetType = row.problem_id ? 'problem' : 'solution';
  const targetId = row.problem_id ?? row.solution_id ?? '';
  return { id: row.id, parentId: row.parent_id, targetType, targetId, authorId: row.author_id, authorName: profile?.display_name || profile?.username || 'Usuário', authorAvatarUrl: profile?.avatar_url ?? null, problemId: row.problem_id, solutionId: row.solution_id, content: row.content, edited: row.edited, deleted: row.deleted, visibility: isContentVisibility(row.visibility) ? row.visibility : 'visible', bestAnswer: row.best_answer, reports: row.reports ?? [], createdAt: row.created_at, updatedAt: row.updated_at };
}
function validateContent(content: string): RepositoryResult<string> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, message: 'Escreva um comentário antes de publicar.' };
  if (trimmed.length > 2000) return { ok: false, message: 'O comentário deve ter no máximo 2000 caracteres.' };
  return { ok: true, data: trimmed };
}
function mapRows(data: unknown[] | null): RepositoryResult<Comment[]> {
  const parsed = (data ?? []).map(parseCommentRow);
  if (parsed.some((row) => !row)) return { ok: false, message: 'Supabase retornou comentários em formato inválido.' };
  return { ok: true, data: parsed.map((row) => mapCommentRowToDomain(row!)) };
}

export class SupabaseCommentRepository {
  constructor(private readonly client: SupabaseClient) {}
  async listByProblem(problemId: string): Promise<RepositoryResult<Comment[]>> { const { data, error } = await this.client.from('comments').select(selectColumns).eq('problem_id', problemId).order('created_at', { ascending: true }); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível listar comentários do problema.') }; return mapRows(data as unknown[] | null); }
  async listBySolution(solutionId: string): Promise<RepositoryResult<Comment[]>> { const { data, error } = await this.client.from('comments').select(selectColumns).eq('solution_id', solutionId).order('created_at', { ascending: true }); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível listar comentários da solução.') }; return mapRows(data as unknown[] | null); }
  async listReported(): Promise<RepositoryResult<Comment[]>> { const { data, error } = await this.client.rpc('list_reported_comments'); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível listar comentários reportados.') }; return mapRows(data as unknown[] | null); }
  async create(input: CommentInput): Promise<RepositoryResult<Comment>> { const content = validateContent(input.content); if (!content.ok) return content; const payload: { author_id: string; parent_id: string | null; problem_id?: string; solution_id?: string; content: string } = { author_id: input.authorId, parent_id: input.parentId ?? null, content: content.data }; if ('problemId' in input) payload.problem_id = input.problemId; else payload.solution_id = input.solutionId; const { data, error } = await this.client.from('comments').insert(payload).select(selectColumns).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível criar o comentário.') }; const row = parseCommentRow(data); return row ? { ok: true, data: mapCommentRowToDomain(row) } : { ok: false, message: 'Supabase retornou comentário criado em formato inválido.' }; }
  async update(id: string, input: CommentUpdateInput): Promise<RepositoryResult<Comment>> { const content = validateContent(input.content); if (!content.ok) return content; const { data, error } = await this.client.from('comments').update({ content: content.data }).eq('id', id).select(selectColumns).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível atualizar o comentário.') }; const row = parseCommentRow(data); return row ? { ok: true, data: mapCommentRowToDomain(row) } : { ok: false, message: 'Supabase retornou comentário atualizado em formato inválido.' }; }
  async report(id: string, reason: string): Promise<RepositoryResult<Comment>> { const rpc = await this.client.rpc('report_comment', { p_comment_id: id, p_reason: reason.trim() }); if (rpc.error) return { ok: false, message: errorMessage(rpc.error, 'Não foi possível reportar o comentário.') }; const { data, error } = await this.client.from('comments').select(selectColumns).eq('id', id).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível carregar o comentário reportado.') }; const row = parseCommentRow(data); return row ? { ok: true, data: mapCommentRowToDomain(row) } : { ok: false, message: 'Supabase retornou comentário reportado em formato inválido.' }; }
  async setBestAnswer(_targetType: 'problem' | 'solution', _targetId: string, id: string): Promise<RepositoryResult<null>> { const { error } = await this.client.rpc('mark_comment_best_answer', { p_comment_id: id }); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível marcar melhor resposta.') }; return { ok: true, data: null }; }
  async moderateVisibility(id: string, visibility: ContentVisibility): Promise<RepositoryResult<Comment>> { const rpc = await this.client.rpc('moderate_comment_visibility', { p_comment_id: id, p_visibility: visibility }); if (rpc.error) return { ok: false, message: errorMessage(rpc.error, 'Não foi possível moderar o comentário.') }; const { data, error } = await this.client.from('comments').select(selectColumns).eq('id', id).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível carregar o comentário moderado.') }; const row = parseCommentRow(data); return row ? { ok: true, data: mapCommentRowToDomain(row) } : { ok: false, message: 'Supabase retornou comentário moderado em formato inválido.' }; }
  async delete(id: string): Promise<RepositoryResult<null>> { const { error } = await this.client.from('comments').delete().eq('id', id); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível excluir o comentário.') }; return { ok: true, data: null }; }
}
export const CommentRepository = supabaseClient ? new SupabaseCommentRepository(supabaseClient) : null;

export const COMMENTS_KEY = 'banco-de-solucoes.discussions.comments';
export const REACTIONS_KEY = 'banco-de-solucoes.discussions.reactions';
function isCommentReport(value: unknown): value is CommentReport { if (!isRecord(value)) return false; return isString(value.userId) && isString(value.reason) && isString(value.createdAt); }
function isContentVisibility(value: unknown): value is ContentVisibility { return value === 'visible' || value === 'hidden' || value === 'removed'; }
export function normalizeComment(value: unknown): DiscussionComment | null {
  if (!isRecord(value)) return null;
  if (!(isString(value.id) && (value.parentId === null || isString(value.parentId)) && (value.targetType === 'problem' || value.targetType === 'solution') && isString(value.targetId) && isString(value.authorId) && isString(value.authorName) && isString(value.content) && isString(value.createdAt) && isString(value.updatedAt) && typeof value.edited === 'boolean' && typeof value.deleted === 'boolean' && typeof value.bestAnswer === 'boolean' && Array.isArray(value.reports) && value.reports.every(isCommentReport))) return null;
  return { id: value.id, parentId: value.parentId, targetType: value.targetType, targetId: value.targetId, authorId: value.authorId, authorName: value.authorName, content: value.content, createdAt: value.createdAt, updatedAt: value.updatedAt, edited: value.edited, deleted: value.deleted, visibility: isContentVisibility(value.visibility) ? value.visibility : value.deleted ? 'removed' : 'visible', bestAnswer: value.bestAnswer, reports: value.reports };
}
export function isComment(value: unknown): value is DiscussionComment { return normalizeComment(value) !== null; }
export function normalizeCommentArray(value: unknown): DiscussionComment[] { return Array.isArray(value) ? value.map(normalizeComment).filter((item): item is DiscussionComment => item !== null) : []; }
export function isCommentArray(value: unknown): value is DiscussionComment[] { return Array.isArray(value) && value.every(isComment); }
export function isReaction(value: unknown): value is Reaction { if (!isRecord(value)) return false; return isString(value.id) && isString(value.commentId) && isString(value.userId) && (value.type === 'like' || value.type === 'support' || value.type === 'interesting' || value.type === 'needsEvidence') && isString(value.createdAt); }
export function isReactionArray(value: unknown): value is Reaction[] { return Array.isArray(value) && value.every(isReaction); }
