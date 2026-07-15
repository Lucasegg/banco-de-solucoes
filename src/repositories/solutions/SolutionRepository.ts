import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { ImplementationDifficulty, Solution, SolutionCategory, SolutionMaturityLevel, SolutionStatus } from '../../types/domain';
import type { RepositoryResult } from '../problems/ProblemRepository';

export type SolutionProblemRow = { problem_id: string };
export type SolutionRow = {
  id: string;
  author_id: string;
  author_name: string | null;
  title: string;
  summary: string;
  description: string;
  category: string;
  image_url: string | null;
  organization: string;
  status: string;
  maturity_level: string;
  implementation_difficulty: string;
  estimated_cost: string | null;
  implementation_time: string | null;
  location: string;
  country: string;
  impact_metric: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
  evidence_links: string[];
  created_at: string;
  updated_at: string;
  solution_problems?: SolutionProblemRow[];
};
export type SolutionInput = Pick<Solution, 'title' | 'summary' | 'description' | 'category' | 'organization' | 'status' | 'maturityLevel' | 'implementationDifficulty' | 'estimatedCost' | 'implementationTime' | 'location' | 'country' | 'impactMetric' | 'tags' | 'evidenceLinks' | 'relatedProblemIds'> & { image?: string; authorId: string; author?: string };

const selectColumns = 'id,author_id,author_name,title,summary,description,category,image_url,organization,status,maturity_level,implementation_difficulty,estimated_cost,implementation_time,location,country,impact_metric,likes,comments,views,tags,evidence_links,created_at,updated_at,solution_problems(problem_id)';
const selectColumnsWithProblemFilter = 'id,author_id,author_name,title,summary,description,category,image_url,organization,status,maturity_level,implementation_difficulty,estimated_cost,implementation_time,location,country,impact_metric,likes,comments,views,tags,evidence_links,created_at,updated_at,solution_problems!inner(problem_id)';
const fallbackImage = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80';
const categories: SolutionCategory[] = ['Infraestrutura', 'Educação', 'Saúde', 'Segurança', 'Tecnologia', 'Mobilidade', 'Meio Ambiente', 'Assistência Social', 'Empreendedorismo', 'Outros'];
const statuses: SolutionStatus[] = ['Proposta', 'Em teste', 'Implementada', 'Validada', 'Arquivada'];
const maturities: SolutionMaturityLevel[] = ['Ideia', 'Protótipo', 'Piloto', 'Em operação', 'Escalável'];
const difficulties: ImplementationDifficulty[] = ['Baixa', 'Média', 'Alta'];
const safe = <T extends string>(value: string, allowed: readonly T[], fallback: T) => allowed.includes(value as T) ? value as T : fallback;
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === 'string'; }
function isNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every(isString); }
function errorMessage(error: unknown, fallback: string) { return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback; }
function parseSolutionProblemRows(value: unknown): SolutionProblemRow[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const rows = value.map((entry) => isRecord(entry) && isString(entry.problem_id) ? { problem_id: entry.problem_id } : null);
  return rows.some((row) => !row) ? null : rows as SolutionProblemRow[];
}

export function parseSolutionRow(value: unknown): SolutionRow | null {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.author_id) || !isString(value.title) || !isString(value.summary) || !isString(value.description) || !isString(value.category) || !isString(value.organization) || !isString(value.status) || !isString(value.maturity_level) || !isString(value.implementation_difficulty) || !isString(value.location) || !isString(value.country) || !isString(value.impact_metric) || !isString(value.created_at) || !isString(value.updated_at)) return null;
  const links = parseSolutionProblemRows(value.solution_problems);
  if (!links) return null;
  return { id: value.id, author_id: value.author_id, author_name: isString(value.author_name) ? value.author_name : null, title: value.title, summary: value.summary, description: value.description, category: value.category, image_url: isString(value.image_url) ? value.image_url : null, organization: value.organization, status: value.status, maturity_level: value.maturity_level, implementation_difficulty: value.implementation_difficulty, estimated_cost: isString(value.estimated_cost) ? value.estimated_cost : null, implementation_time: isString(value.implementation_time) ? value.implementation_time : null, location: value.location, country: value.country, impact_metric: value.impact_metric, likes: isNumber(value.likes) ? value.likes : 0, comments: isNumber(value.comments) ? value.comments : 0, views: isNumber(value.views) ? value.views : 0, tags: isStringArray(value.tags) ? value.tags : [], evidence_links: isStringArray(value.evidence_links) ? value.evidence_links : [], created_at: value.created_at, updated_at: value.updated_at, solution_problems: links };
}

export function mapSolutionRowToDomain(row: SolutionRow): Solution {
  const relatedProblemIds = row.solution_problems?.map((link) => link.problem_id) ?? [];
  return { id: row.id, authorId: row.author_id, title: row.title, summary: row.summary, description: row.description, category: safe(row.category, categories, 'Outros'), image: row.image_url || fallbackImage, organization: row.organization, author: row.author_name || 'Autor não informado', createdAt: row.created_at, updatedAt: row.updated_at, status: safe(row.status, statuses, 'Proposta'), maturityLevel: safe(row.maturity_level, maturities, 'Ideia'), implementationDifficulty: safe(row.implementation_difficulty, difficulties, 'Baixa'), estimatedCost: row.estimated_cost || 'Não informado', implementationTime: row.implementation_time || 'Não informado', location: row.location, country: row.country, impactMetric: row.impact_metric, likes: row.likes, comments: row.comments, views: row.views, relatedProblemIds, tags: row.tags, evidenceLinks: row.evidence_links };
}

function mapRows(data: unknown[] | null): RepositoryResult<Solution[]> {
  const parsed = (data ?? []).map(parseSolutionRow);
  if (parsed.some((row) => !row)) return { ok: false, message: 'Supabase retornou soluções em formato inválido.' };
  return { ok: true, data: parsed.map((row) => mapSolutionRowToDomain(row!)) };
}

export class SupabaseSolutionRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(): Promise<RepositoryResult<Solution[]>> { const { data, error } = await this.client.from('solutions').select(selectColumns).order('created_at', { ascending: false }); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível listar soluções.') }; return mapRows(data as unknown[] | null); }
  async listByProblemId(problemId: string): Promise<RepositoryResult<Solution[]>> { const { data, error } = await this.client.from('solutions').select(selectColumnsWithProblemFilter).eq('solution_problems.problem_id', problemId).order('created_at', { ascending: false }); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível listar soluções do problema.') }; return mapRows(data as unknown[] | null); }
  async findById(id: string): Promise<RepositoryResult<Solution | null>> { const { data, error } = await this.client.from('solutions').select(selectColumns).eq('id', id).maybeSingle(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível carregar a solução.') }; if (!data) return { ok: true, data: null }; const row = parseSolutionRow(data); return row ? { ok: true, data: mapSolutionRowToDomain(row) } : { ok: false, message: 'Supabase retornou solução em formato inválido.' }; }
  async create(input: SolutionInput): Promise<RepositoryResult<Solution>> {
    const { data, error } = await this.client.rpc('create_solution_with_problems', {
      p_author_id: input.authorId,
      p_author_name: input.author?.trim() || null,
      p_title: input.title.trim(),
      p_summary: input.summary.trim(),
      p_description: input.description.trim(),
      p_category: input.category,
      p_image_url: input.image?.trim() || null,
      p_organization: input.organization.trim(),
      p_status: input.status,
      p_maturity_level: input.maturityLevel,
      p_implementation_difficulty: input.implementationDifficulty,
      p_estimated_cost: input.estimatedCost.trim() || null,
      p_implementation_time: input.implementationTime.trim() || null,
      p_location: input.location.trim(),
      p_country: input.country.trim(),
      p_impact_metric: input.impactMetric.trim(),
      p_tags: input.tags,
      p_evidence_links: input.evidenceLinks,
      p_problem_ids: input.relatedProblemIds,
    });
    if (error) return { ok: false, message: errorMessage(error, 'Não foi possível criar a solução.') };
    const solutionId = typeof data === 'string' ? data : null;
    if (!solutionId) return { ok: false, message: 'Supabase retornou identificador de solução inválido.' };
    return this.findCreated(solutionId);
  }
  private async findCreated(id: string): Promise<RepositoryResult<Solution>> { const result = await this.findById(id); if (!result.ok) return result; if (!result.data) return { ok: false, message: 'Solução criada não foi encontrada.' }; return { ok: true, data: result.data }; }
  async update(id: string, input: Partial<SolutionInput>): Promise<RepositoryResult<Solution>> {
    const { data, error } = await this.client.rpc('update_solution_with_problems', {
      p_solution_id: id,
      p_title: input.title !== undefined ? input.title.trim() : null,
      p_summary: input.summary !== undefined ? input.summary.trim() : null,
      p_description: input.description !== undefined ? input.description.trim() : null,
      p_category: input.category ?? null,
      p_image_url: input.image !== undefined ? input.image.trim() || null : null,
      p_organization: input.organization !== undefined ? input.organization.trim() : null,
      p_author_name: input.author !== undefined ? input.author.trim() || null : null,
      p_status: input.status ?? null,
      p_maturity_level: input.maturityLevel ?? null,
      p_implementation_difficulty: input.implementationDifficulty ?? null,
      p_estimated_cost: input.estimatedCost !== undefined ? input.estimatedCost.trim() || null : null,
      p_implementation_time: input.implementationTime !== undefined ? input.implementationTime.trim() || null : null,
      p_location: input.location !== undefined ? input.location.trim() : null,
      p_country: input.country !== undefined ? input.country.trim() : null,
      p_impact_metric: input.impactMetric !== undefined ? input.impactMetric.trim() : null,
      p_tags: input.tags ?? null,
      p_evidence_links: input.evidenceLinks ?? null,
      p_problem_ids: input.relatedProblemIds ?? null,
    });
    if (error) return { ok: false, message: errorMessage(error, 'Não foi possível atualizar a solução.') };
    const solutionId = typeof data === 'string' ? data : id;
    return this.findCreated(solutionId);
  }
  async delete(id: string): Promise<RepositoryResult<null>> { const { error } = await this.client.from('solutions').delete().eq('id', id); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível excluir a solução.') }; return { ok: true, data: null }; }
}
export const SolutionRepository = supabaseClient ? new SupabaseSolutionRepository(supabaseClient) : null;
