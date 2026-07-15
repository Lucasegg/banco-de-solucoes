import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { ImpactLevel, Problem, ProblemCategory, ProblemStatus } from '../../types/domain';

export type ProblemRow = {
  id: string;
  author_id: string;
  author_name: string | null;
  title: string;
  summary: string | null;
  description: string;
  category: string;
  city: string;
  state: string;
  country: string;
  image_url: string | null;
  status: string;
  views: number;
  likes: number;
  comments: number;
  impact_level: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};
export type ProblemInput = Pick<Problem, 'title' | 'summary' | 'description' | 'category' | 'city' | 'state' | 'country' | 'status' | 'impactLevel' | 'tags'> & { image?: string; authorId: string; author?: string };
export type RepositoryResult<T> = { ok: true; data: T } | { ok: false; message: string };

const selectColumns = 'id,author_id,author_name,title,summary,description,category,city,state,country,image_url,status,views,likes,comments,impact_level,tags,created_at,updated_at';
const fallbackImage = 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80';
const problemStatuses: ProblemStatus[] = ['Aberto', 'Em andamento', 'Resolvido'];
const categories: ProblemCategory[] = ['Infraestrutura', 'Educação', 'Saúde', 'Segurança', 'Tecnologia', 'Mobilidade', 'Meio Ambiente', 'Assistência Social', 'Empreendedorismo', 'Outros'];
const impacts: ImpactLevel[] = ['local', 'regional', 'national', 'global'];
const safe = <T extends string>(value: string, allowed: readonly T[], fallback: T) => allowed.includes(value as T) ? value as T : fallback;

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === 'string'; }
function isNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every(isString); }
function errorMessage(error: unknown, fallback: string) { return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback; }

export function parseProblemRow(value: unknown): ProblemRow | null {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.author_id) || !isString(value.title) || !isString(value.description) || !isString(value.category) || !isString(value.city) || !isString(value.state) || !isString(value.country) || !isString(value.status) || !isString(value.impact_level) || !isString(value.created_at) || !isString(value.updated_at)) return null;
  return {
    id: value.id,
    author_id: value.author_id,
    author_name: isString(value.author_name) ? value.author_name : null,
    title: value.title,
    summary: isString(value.summary) ? value.summary : null,
    description: value.description,
    category: value.category,
    city: value.city,
    state: value.state,
    country: value.country,
    image_url: isString(value.image_url) ? value.image_url : null,
    status: value.status,
    views: isNumber(value.views) ? value.views : 0,
    likes: isNumber(value.likes) ? value.likes : 0,
    comments: isNumber(value.comments) ? value.comments : 0,
    impact_level: value.impact_level,
    tags: isStringArray(value.tags) ? value.tags : [],
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

export function mapProblemRowToDomain(row: ProblemRow): Problem {
  return { id: row.id, authorId: row.author_id, title: row.title, summary: row.summary || row.description.slice(0, 160), description: row.description, category: safe(row.category, categories, 'Outros'), city: row.city, state: row.state, country: row.country, image: row.image_url || fallbackImage, createdAt: row.created_at, author: row.author_name || 'Autor não informado', status: safe(row.status, problemStatuses, 'Aberto'), views: row.views, likes: row.likes, comments: row.comments, impactLevel: safe(row.impact_level, impacts, 'local'), tags: row.tags };
}

function mapRows(data: unknown[] | null): RepositoryResult<Problem[]> {
  const parsed = (data ?? []).map(parseProblemRow);
  if (parsed.some((row) => !row)) return { ok: false, message: 'Supabase retornou problemas em formato inválido.' };
  return { ok: true, data: parsed.map((row) => mapProblemRowToDomain(row!)) };
}

export class SupabaseProblemRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(): Promise<RepositoryResult<Problem[]>> { const { data, error } = await this.client.from('problems').select(selectColumns).order('created_at', { ascending: false }); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível listar problemas.') }; return mapRows(data as unknown[] | null); }
  async findById(id: string): Promise<RepositoryResult<Problem | null>> { const { data, error } = await this.client.from('problems').select(selectColumns).eq('id', id).maybeSingle(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível carregar o problema.') }; if (!data) return { ok: true, data: null }; const row = parseProblemRow(data); return row ? { ok: true, data: mapProblemRowToDomain(row) } : { ok: false, message: 'Supabase retornou problema em formato inválido.' }; }
  async create(input: ProblemInput): Promise<RepositoryResult<Problem>> { const { data, error } = await this.client.from('problems').insert({ title: input.title.trim(), summary: input.summary.trim(), description: input.description.trim(), category: input.category, city: input.city.trim(), state: input.state.trim(), country: input.country.trim(), image_url: input.image?.trim() || null, author_id: input.authorId, author_name: input.author?.trim() || null, status: input.status, impact_level: input.impactLevel, tags: input.tags }).select(selectColumns).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível criar o problema.') }; const row = parseProblemRow(data); return row ? { ok: true, data: mapProblemRowToDomain(row) } : { ok: false, message: 'Supabase retornou problema criado em formato inválido.' }; }
  async update(id: string, input: Partial<ProblemInput>): Promise<RepositoryResult<Problem>> { const payload: Record<string, unknown> = {}; if (input.title !== undefined) payload.title = input.title.trim(); if (input.summary !== undefined) payload.summary = input.summary.trim(); if (input.description !== undefined) payload.description = input.description.trim(); if (input.category !== undefined) payload.category = input.category; if (input.city !== undefined) payload.city = input.city.trim(); if (input.state !== undefined) payload.state = input.state.trim(); if (input.country !== undefined) payload.country = input.country.trim(); if (input.image !== undefined) payload.image_url = input.image.trim() || null; if (input.author !== undefined) payload.author_name = input.author.trim() || null; if (input.status !== undefined) payload.status = input.status; if (input.impactLevel !== undefined) payload.impact_level = input.impactLevel; if (input.tags !== undefined) payload.tags = input.tags; const { data, error } = await this.client.from('problems').update(payload).eq('id', id).select(selectColumns).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível atualizar o problema.') }; const row = parseProblemRow(data); return row ? { ok: true, data: mapProblemRowToDomain(row) } : { ok: false, message: 'Supabase retornou problema atualizado em formato inválido.' }; }
  async delete(id: string): Promise<RepositoryResult<null>> { const { error } = await this.client.from('problems').delete().eq('id', id); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível excluir o problema.') }; return { ok: true, data: null }; }
}

export const ProblemRepository = supabaseClient ? new SupabaseProblemRepository(supabaseClient) : null;
