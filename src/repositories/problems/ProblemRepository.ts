import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { ImpactLevel, Problem, ProblemCategory, ProblemStatus } from '../../types/domain';

export type ProblemRow = {
  id: string; title: string; summary: string | null; description: string; category: string; city: string; state: string; country: string; image_url: string | null; author_id: string; author_name: string | null; status: string; views: number | null; likes: number | null; comments: number | null; impact_level: string; tags: string[] | null; created_at: string; updated_at: string;
};
export type ProblemInput = Pick<Problem, 'title' | 'summary' | 'description' | 'category' | 'city' | 'state' | 'country' | 'status' | 'impactLevel' | 'tags'> & { image?: string; authorId: string; author?: string };
export type RepositoryResult<T> = { ok: true; data: T } | { ok: false; message: string };

const selectColumns = 'id,title,summary,description,category,city,state,country,image_url,author_id,author_name,status,views,likes,comments,impact_level,tags,created_at,updated_at';
const fallbackImage = 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80';
const problemStatuses: ProblemStatus[] = ['Aberto', 'Em andamento', 'Resolvido'];
const categories: ProblemCategory[] = ['Infraestrutura', 'Educação', 'Saúde', 'Segurança', 'Tecnologia', 'Mobilidade', 'Meio Ambiente', 'Assistência Social', 'Empreendedorismo', 'Outros'];
const impacts: ImpactLevel[] = ['local', 'regional', 'national', 'global'];
const safe = <T extends string>(value: string, allowed: readonly T[], fallback: T) => allowed.includes(value as T) ? value as T : fallback;

export function mapProblemRowToDomain(row: ProblemRow): Problem {
  return { id: row.id, title: row.title, summary: row.summary || row.description.slice(0, 160), description: row.description, category: safe(row.category, categories, 'Outros'), city: row.city, state: row.state, country: row.country, image: row.image_url || fallbackImage, createdAt: row.created_at, author: row.author_name || 'Autor não informado', status: safe(row.status, problemStatuses, 'Aberto'), views: row.views ?? 0, likes: row.likes ?? 0, comments: row.comments ?? 0, impactLevel: safe(row.impact_level, impacts, 'local'), tags: row.tags ?? [] };
}

function errorMessage(error: unknown, fallback: string) { return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback; }

export class SupabaseProblemRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(): Promise<RepositoryResult<Problem[]>> { const { data, error } = await this.client.from('problems').select(selectColumns).order('created_at', { ascending: false }); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível listar problemas.') }; return { ok: true, data: (data ?? []).map((row: unknown) => mapProblemRowToDomain(row as ProblemRow)) }; }
  async findById(id: string): Promise<RepositoryResult<Problem | null>> { const { data, error } = await this.client.from('problems').select(selectColumns).eq('id', id).maybeSingle(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível carregar o problema.') }; return { ok: true, data: data ? mapProblemRowToDomain(data as ProblemRow) : null }; }
  async create(input: ProblemInput): Promise<RepositoryResult<Problem>> { const { data, error } = await this.client.from('problems').insert({ title: input.title.trim(), summary: input.summary.trim(), description: input.description.trim(), category: input.category, city: input.city.trim(), state: input.state.trim(), country: input.country.trim(), image_url: input.image?.trim() || null, author_id: input.authorId, author_name: input.author?.trim() || null, status: input.status, impact_level: input.impactLevel, tags: input.tags }).select(selectColumns).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível criar o problema.') }; return { ok: true, data: mapProblemRowToDomain(data as ProblemRow) }; }
  async update(id: string, input: Partial<ProblemInput>): Promise<RepositoryResult<Problem>> { const payload: Record<string, unknown> = {}; if (input.title !== undefined) payload.title = input.title.trim(); if (input.summary !== undefined) payload.summary = input.summary.trim(); if (input.description !== undefined) payload.description = input.description.trim(); if (input.category !== undefined) payload.category = input.category; if (input.city !== undefined) payload.city = input.city.trim(); if (input.state !== undefined) payload.state = input.state.trim(); if (input.country !== undefined) payload.country = input.country.trim(); if (input.image !== undefined) payload.image_url = input.image.trim() || null; if (input.author !== undefined) payload.author_name = input.author.trim() || null; if (input.status !== undefined) payload.status = input.status; if (input.impactLevel !== undefined) payload.impact_level = input.impactLevel; if (input.tags !== undefined) payload.tags = input.tags; const { data, error } = await this.client.from('problems').update(payload).eq('id', id).select(selectColumns).single(); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível atualizar o problema.') }; return { ok: true, data: mapProblemRowToDomain(data as ProblemRow) }; }
  async delete(id: string): Promise<RepositoryResult<null>> { const { error } = await this.client.from('problems').delete().eq('id', id); if (error) return { ok: false, message: errorMessage(error, 'Não foi possível excluir o problema.') }; return { ok: true, data: null }; }
}

export const ProblemRepository = supabaseClient ? new SupabaseProblemRepository(supabaseClient) : null;
