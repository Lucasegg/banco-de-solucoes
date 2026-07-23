import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import { safeDatabaseMessage } from '../errors';

export type SearchTab = 'problems' | 'solutions';
export type SearchSort = 'relevance' | 'recent' | 'oldest' | 'favorites' | 'comments' | 'updated';
export type BaseFilters = { q: string; category: string; tags: string[]; from: string; to: string; favorites: boolean; mine: boolean; sort: SearchSort; page: number };
export type ProblemSearchFilters = BaseFilters & { status: string; state: string; city: string; hasSolution: '' | 'yes' | 'no' };
export type SolutionSearchFilters = BaseFilters & { organization: string; problemId: string; evidence: '' | 'yes' | 'no'; impact: '' | 'yes' | 'no' };
export type SearchResult = { id: string; title: string; summary: string; category: string; tags: string[]; author_name: string; created_at: string; updated_at: string; favorites: number; comments: number; total_count: number; status?: string; city?: string; state?: string; solution_count?: number; organization?: string; problem_ids?: string[]; impact_metric?: string };
export type SearchResponse = { items: SearchResult[]; total: number };

const asRows = (value: unknown): SearchResult[] => Array.isArray(value) ? value.filter((row): row is SearchResult => Boolean(row) && typeof row === 'object' && typeof (row as SearchResult).id === 'string' && typeof (row as SearchResult).title === 'string').map((row) => ({ ...row, tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [], total_count: Number(row.total_count) || 0 })) : [];
const nullable = (value: string) => value.trim() || null;
export const canonicalUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim()) ? value.trim().toLowerCase() : null;
const date = (value: string, end = false) => value ? `${value}${end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}` : null;

export class SupabaseSearchRepository {
  constructor(private readonly client: SupabaseClient) {}
  async searchProblems(filters: ProblemSearchFilters): Promise<{ ok: true; data: SearchResponse } | { ok: false; message: string }> {
    const { data, error } = await this.client.rpc('search_problems', { p_query: nullable(filters.q), p_category: nullable(filters.category), p_status: nullable(filters.status), p_state: nullable(filters.state), p_city: nullable(filters.city), p_tags: filters.tags.length ? filters.tags : null, p_created_from: date(filters.from), p_created_to: date(filters.to, true), p_has_solution: filters.hasSolution === '' ? null : filters.hasSolution === 'yes', p_favorites_only: filters.favorites, p_authored_only: filters.mine, p_sort: filters.sort, p_limit: 20, p_offset: (filters.page - 1) * 20 });
    if (error) return { ok: false, message: safeDatabaseMessage(error, 'Não foi possível concluir a busca.') };
    const items = asRows(data); return { ok: true, data: { items, total: items[0]?.total_count ?? 0 } };
  }
  async searchSolutions(filters: SolutionSearchFilters): Promise<{ ok: true; data: SearchResponse } | { ok: false; message: string }> {
    const { data, error } = await this.client.rpc('search_solutions', { p_query: nullable(filters.q), p_category: nullable(filters.category), p_organization: nullable(filters.organization), p_tags: filters.tags.length ? filters.tags : null, p_created_from: date(filters.from), p_created_to: date(filters.to, true), p_problem_id: canonicalUuid(filters.problemId), p_favorites_only: filters.favorites, p_authored_only: filters.mine, p_has_evidence: filters.evidence === '' ? null : filters.evidence === 'yes', p_has_impact_metric: filters.impact === '' ? null : filters.impact === 'yes', p_sort: filters.sort, p_limit: 20, p_offset: (filters.page - 1) * 20 });
    if (error) return { ok: false, message: safeDatabaseMessage(error, 'Não foi possível concluir a busca.') };
    const items = asRows(data); return { ok: true, data: { items, total: items[0]?.total_count ?? 0 } };
  }
}
export const SearchRepository = supabaseClient ? new SupabaseSearchRepository(supabaseClient) : null;
