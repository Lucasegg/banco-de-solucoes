import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { ImpactLevel, Problem, ProblemCategory, ProblemStatus } from '../../types/domain';

export type ProblemRow = {
  id: string; author_id: string | null; author_name: string | null; title: string; summary: string | null;
  description: string; category: string; city: string; state: string; country: string; image_url: string | null;
  status: string; views: number; likes: number; comments: number; impact_level: string; tags: string[];
  created_at: string; updated_at: string; source_type: string | null; source_name: string | null;
  source_url: string | null; source_published_at: string | null; source_accessed_at: string | null;
  source_verified_at: string | null; source_metadata: Record<string, unknown> | null;
  imported_from_external_source: boolean;
};
export type ProblemInput = Pick<Problem, 'title' | 'summary' | 'description' | 'category' | 'city' | 'state' | 'country' | 'status' | 'impactLevel' | 'tags'> & { image?: string; authorId: string; author?: string };
export type RepositoryResult<T> = { ok: true; data: T } | { ok: false; message: string };

const selectColumns = 'id,author_id,author_name,title,summary,description,category,city,state,country,image_url,status,views,likes,comments,impact_level,tags,created_at,updated_at,source_type,source_name,source_url,source_published_at,source_accessed_at,source_verified_at,source_metadata,imported_from_external_source';
const problemStatuses: ProblemStatus[] = ['Aberto', 'Em andamento', 'Resolvido'];
const categories: ProblemCategory[] = ['Infraestrutura', 'Educação', 'Saúde', 'Segurança', 'Tecnologia', 'Mobilidade', 'Meio Ambiente', 'Assistência Social', 'Empreendedorismo', 'Outros'];
const impacts: ImpactLevel[] = ['local', 'regional', 'national', 'global'];
const safe = <T extends string>(value: string, allowed: readonly T[], fallback: T) => allowed.includes(value as T) ? value as T : fallback;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const errorMessage = (error: unknown, fallback: string) => error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback;

export function parseProblemRow(value: unknown): ProblemRow | null {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isNullableString(value.author_id) || !isString(value.title) || !isString(value.description) || !isString(value.category) || !isString(value.city) || !isString(value.state) || !isString(value.country) || !isString(value.status) || !isString(value.impact_level) || !isString(value.created_at) || !isString(value.updated_at) || typeof value.imported_from_external_source !== 'boolean') return null;
  return {
    id: value.id, author_id: value.author_id, author_name: isString(value.author_name) ? value.author_name : null,
    title: value.title, summary: isString(value.summary) ? value.summary : null, description: value.description,
    category: value.category, city: value.city, state: value.state, country: value.country,
    image_url: isString(value.image_url) ? value.image_url : null, status: value.status,
    views: isNumber(value.views) ? value.views : 0, likes: isNumber(value.likes) ? value.likes : 0,
    comments: isNumber(value.comments) ? value.comments : 0, impact_level: value.impact_level,
    tags: isStringArray(value.tags) ? value.tags : [], created_at: value.created_at, updated_at: value.updated_at,
    source_type: isString(value.source_type) ? value.source_type : null, source_name: isString(value.source_name) ? value.source_name : null,
    source_url: isString(value.source_url) ? value.source_url : null, source_published_at: isString(value.source_published_at) ? value.source_published_at : null,
    source_accessed_at: isString(value.source_accessed_at) ? value.source_accessed_at : null, source_verified_at: isString(value.source_verified_at) ? value.source_verified_at : null,
    source_metadata: isRecord(value.source_metadata) ? value.source_metadata : null,
    imported_from_external_source: value.imported_from_external_source,
  };
}

export function mapProblemRowToDomain(row: ProblemRow): Problem {
  return {
    id: row.id, authorId: row.author_id ?? undefined, title: row.title,
    summary: row.summary || row.description.slice(0, 160), description: row.description,
    category: safe(row.category, categories, 'Outros'), city: row.city, state: row.state, country: row.country,
    image: row.image_url ?? undefined, createdAt: row.created_at,
    author: row.imported_from_external_source ? 'Registro criado a partir de informação pública' : (row.author_name || 'Usuário da plataforma'),
    status: safe(row.status, problemStatuses, 'Aberto'), views: row.views, likes: row.likes, comments: row.comments,
    impactLevel: safe(row.impact_level, impacts, 'local'), tags: row.tags,
    importedFromExternalSource: row.imported_from_external_source, sourceType: row.source_type ?? undefined,
    sourceName: row.source_name ?? undefined, sourceUrl: row.source_url ?? undefined,
    sourcePublishedAt: row.source_published_at ?? undefined, sourceAccessedAt: row.source_accessed_at ?? undefined,
    sourceVerifiedAt: row.source_verified_at ?? undefined, sourceMetadata: row.source_metadata ?? undefined,
  };
}

function mapRows(data: unknown[] | null): RepositoryResult<Problem[]> {
  const parsed = (data ?? []).map(parseProblemRow);
  if (parsed.some((row) => !row)) return { ok: false, message: 'Supabase retornou problemas em formato inválido.' };
  return { ok: true, data: parsed.map((row) => mapProblemRowToDomain(row!)) };
}

export class SupabaseProblemRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(): Promise<RepositoryResult<Problem[]>> {
    const { data, error } = await this.client.from('problems').select(selectColumns)
      .order('imported_from_external_source', { ascending: false }).order('source_verified_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    if (error) return { ok: false, message: errorMessage(error, 'Não foi possível listar problemas.') };
    return mapRows(data as unknown[] | null);
  }
  async findById(id: string): Promise<RepositoryResult<Problem | null>> { const { data, error } = await this.client.from('problems').select(selectColumns).eq('id', id).maybeSingle(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível carregar o problema.') }; if (!data) return { ok: true, data: null }; const row = parseProblemRow(data); return row ? { ok: true, data: mapProblemRowToDomain(row) } : { ok: false, message: 'Supabase retornou problema em formato inválido.' }; }
  async create(input: ProblemInput): Promise<RepositoryResult<Problem>> { const { data, error } = await this.client.from('problems').insert({ title: input.title.trim(), summary: input.summary.trim(), description: input.description.trim(), category: input.category, city: input.city.trim(), state: input.state.trim(), country: input.country.trim(), image_url: input.image?.trim() || null, author_id: input.authorId, author_name: input.author?.trim() || null, status: input.status, impact_level: input.impactLevel, tags: input.tags, imported_from_external_source: false }).select(selectColumns).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível criar o problema.') }; const row = parseProblemRow(data); return row ? { ok: true, data: mapProblemRowToDomain(row) } : { ok: false, message: 'Supabase retornou problema criado em formato inválido.' }; }
  async update(id: string, input: Partial<ProblemInput>): Promise<RepositoryResult<Problem>> { const payload: Record<string, unknown> = {}; if (input.title !== undefined) payload.title = input.title.trim(); if (input.summary !== undefined) payload.summary = input.summary.trim(); if (input.description !== undefined) payload.description = input.description.trim(); if (input.category !== undefined) payload.category = input.category; if (input.city !== undefined) payload.city = input.city.trim(); if (input.state !== undefined) payload.state = input.state.trim(); if (input.country !== undefined) payload.country = input.country.trim(); if (input.image !== undefined) payload.image_url = input.image.trim() || null; if (input.author !== undefined) payload.author_name = input.author.trim() || null; if (input.status !== undefined) payload.status = input.status; if (input.impactLevel !== undefined) payload.impact_level = input.impactLevel; if (input.tags !== undefined) payload.tags = input.tags; const { data, error } = await this.client.from('problems').update(payload).eq('id', id).select(selectColumns).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível atualizar o problema.') }; const row = parseProblemRow(data); return row ? { ok: true, data: mapProblemRowToDomain(row) } : { ok: false, message: 'Supabase retornou problema atualizado em formato inválido.' }; }
  async delete(id: string): Promise<RepositoryResult<null>> { const { error } = await this.client.from('problems').delete().eq('id', id); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível excluir o problema.') }; return { ok: true, data: null }; }
}

export const ProblemRepository = supabaseClient ? new SupabaseProblemRepository(supabaseClient) : null;
