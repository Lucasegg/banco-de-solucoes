import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { Problem, Solution } from '../../types/domain';
import { mapProblemRowToDomain, parseProblemRow, type RepositoryResult } from '../problems/ProblemRepository';
import { mapSolutionRowToDomain, parseSolutionRow } from '../solutions/SolutionRepository';
import { publicErrorMessage } from '../errors';

export type FavoriteKind = 'problems' | 'solutions';
export type FavoriteTarget = { kind: 'problems'; id: string } | { kind: 'solutions'; id: string };

export interface Favorite {
  id: string;
  userId: string;
  problemId: string | null;
  solutionId: string | null;
  createdAt: string;
  problem?: Problem;
  solution?: Solution;
}

type FavoriteRow = {
  id: string;
  user_id: string;
  problem_id: string | null;
  solution_id: string | null;
  created_at: string;
  problems?: unknown;
  solutions?: unknown;
};

type FavoriteList = { problems: Favorite[]; solutions: Favorite[] };

const problemColumns = 'id,author_id,author_name,title,summary,description,category,city,state,country,image_url,status,views,likes,comments,impact_level,tags,created_at,updated_at';
const solutionColumns = 'id,author_id,author_name,title,summary,description,category,image_url,organization,status,maturity_level,implementation_difficulty,estimated_cost,implementation_time,location,country,impact_metric,likes,comments,views,tags,evidence_links,created_at,updated_at,solution_problems(problem_id)';
const selectColumns = `id,user_id,problem_id,solution_id,created_at,problems(${problemColumns}),solutions(${solutionColumns})`;

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === 'string'; }
function targetColumn(kind: FavoriteKind) { return kind === 'problems' ? 'problem_id' : 'solution_id'; }

function parseFavoriteRow(value: unknown): FavoriteRow | null {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.user_id) || !isString(value.created_at)) return null;
  const problemId = isString(value.problem_id) ? value.problem_id : null;
  const solutionId = isString(value.solution_id) ? value.solution_id : null;
  if ((problemId && solutionId) || (!problemId && !solutionId)) return null;
  return { id: value.id, user_id: value.user_id, problem_id: problemId, solution_id: solutionId, created_at: value.created_at, problems: value.problems, solutions: value.solutions };
}

function mapFavoriteRow(row: FavoriteRow): Favorite | null {
  const problemRow = row.problems ? parseProblemRow(row.problems) : null;
  const solutionRow = row.solutions ? parseSolutionRow(row.solutions) : null;
  if (row.problem_id && row.problems && !problemRow) return null;
  if (row.solution_id && row.solutions && !solutionRow) return null;
  return {
    id: row.id,
    userId: row.user_id,
    problemId: row.problem_id,
    solutionId: row.solution_id,
    createdAt: row.created_at,
    problem: problemRow ? mapProblemRowToDomain(problemRow) : undefined,
    solution: solutionRow ? mapSolutionRowToDomain(solutionRow) : undefined,
  };
}

export function mapFavoriteRows(data: unknown[] | null): RepositoryResult<Favorite[]> {
  const parsed = (data ?? []).map(parseFavoriteRow);
  if (parsed.some((row) => !row)) return { ok: false, message: 'Não foi possível carregar seus favoritos.' };
  const favorites = parsed.map((row) => mapFavoriteRow(row!));
  if (favorites.some((favorite) => !favorite)) return { ok: false, message: 'Não foi possível carregar seus favoritos.' };
  return { ok: true, data: favorites as Favorite[] };
}

export class SupabaseFavoriteRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async findByTarget(userId: string, target: FavoriteTarget): Promise<RepositoryResult<Favorite | null>> {
    const { data, error } = await this.client.from('favorites').select(selectColumns).eq('user_id', userId).eq(targetColumn(target.kind), target.id).maybeSingle();
    if (error) return { ok: false, message: publicErrorMessage(error, 'Não foi possível carregar seus favoritos.') };
    if (!data) return { ok: true, data: null };
    const row = parseFavoriteRow(data);
    const favorite = row ? mapFavoriteRow(row) : null;
    return favorite ? { ok: true, data: favorite } : { ok: false, message: 'Não foi possível carregar seus favoritos.' };
  }

  async add(userId: string, target: FavoriteTarget): Promise<RepositoryResult<Favorite>> {
    const existing = await this.findByTarget(userId, target);
    if (!existing.ok) return existing;
    if (existing.data) return { ok: true, data: existing.data };

    const payload = { user_id: userId, problem_id: target.kind === 'problems' ? target.id : null, solution_id: target.kind === 'solutions' ? target.id : null };
    const { data, error } = await this.client.from('favorites').insert(payload).select(selectColumns).single();
    if (error) {
      const duplicateResult = await this.findByTarget(userId, target);
      if (duplicateResult.ok && duplicateResult.data) return { ok: true, data: duplicateResult.data };
      return { ok: false, message: publicErrorMessage(error, 'Não foi possível adicionar aos favoritos. Tente novamente.') };
    }
    const row = parseFavoriteRow(data);
    const favorite = row ? mapFavoriteRow(row) : null;
    // PostgREST returns an object for insert(...).select(...).single(); do not accept
    // an array or an empty body as a created favorite.
    return favorite ? { ok: true, data: favorite } : { ok: false, message: 'Não foi possível adicionar aos favoritos. Tente novamente.' };
  }

  async remove(userId: string, target: FavoriteTarget): Promise<RepositoryResult<null>> {
    const { error } = await this.client.from('favorites').delete().eq('user_id', userId).eq(targetColumn(target.kind), target.id);
    if (error) return { ok: false, message: publicErrorMessage(error, 'Não foi possível remover dos favoritos. Tente novamente.') };
    return { ok: true, data: null };
  }

  async listByUser(userId: string): Promise<RepositoryResult<FavoriteList>> {
    const { data, error } = await this.client.from('favorites').select(selectColumns).eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return { ok: false, message: publicErrorMessage(error, 'Não foi possível carregar seus favoritos.') };
    const result = mapFavoriteRows(data as unknown[] | null);
    if (!result.ok) return result;
    return { ok: true, data: { problems: result.data.filter((favorite) => favorite.problemId), solutions: result.data.filter((favorite) => favorite.solutionId) } };
  }

  async isFavorite(userId: string, target: FavoriteTarget): Promise<RepositoryResult<boolean>> {
    const { data, error } = await this.client.from('favorites').select('id').eq('user_id', userId).eq(targetColumn(target.kind), target.id).maybeSingle();
    if (error) return { ok: false, message: publicErrorMessage(error, 'Não foi possível carregar seus favoritos.') };
    return { ok: true, data: Boolean(data) };
  }
}

export const FavoriteRepository = supabaseClient ? new SupabaseFavoriteRepository(supabaseClient) : null;
