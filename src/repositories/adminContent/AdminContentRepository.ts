import type { SupabaseClient } from '@supabase/supabase-js';
import { solutionStatuses, type SolutionStatus } from '../../types/domain.ts';
import { problemStatuses, type ProblemStatus } from '../../types/problemTimeline.ts';
import { safeDatabaseMessage } from '../errors.ts';

export const ADMIN_CONTENT_PAGE_SIZE = 25;
export type AdminContentKind = 'problem' | 'solution';
export type AdminContentStatus = ProblemStatus | SolutionStatus;
export type AdminContentListOptions = { page: number; search: string; status: AdminContentStatus | 'all' };
export type AdminContentRecord = { id: string; title: string; summary: string; author: string; status: string; category: string; region: string; maturity: string | null; relatedProblems: string[]; relatedSolutionCount: number | null; createdAt: string; updatedAt: string; archived: boolean };
export type AdminContentPage = { records: AdminContentRecord[]; total: number };
type Result<T> = { ok: true; data: T } | { ok: false; message: string };
type Row = Record<string, unknown>;

const searchableColumns: Record<AdminContentKind, readonly string[]> = {
  problem: ['title', 'summary', 'description', 'author_name', 'category', 'city', 'state', 'country'],
  solution: ['title', 'summary', 'description', 'author_name', 'organization', 'category', 'location', 'country', 'maturity_level'],
};

export function adminContentStatuses(kind: AdminContentKind): readonly AdminContentStatus[] { return kind === 'problem' ? problemStatuses : solutionStatuses; }
/** Removes PostgREST filter syntax characters while retaining letters, digits and spaces for a safe ilike pattern. */
export function sanitizeAdminContentSearch(value: string) { return value.normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); }
export function buildAdminContentSearchFilter(kind: AdminContentKind, search: string) {
  const safeSearch = sanitizeAdminContentSearch(search);
  return safeSearch ? searchableColumns[kind].map((column) => `${column}.ilike.*${safeSearch}*`).join(',') : null;
}
function text(value: unknown, fallback = 'Não informado') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function date(value: unknown) { return typeof value === 'string' ? value : ''; }
function relatedProblemTitles(value: unknown) { return Array.isArray(value) ? value.flatMap((item) => item && typeof item === 'object' && typeof (item as Row).problems === 'object' ? [text(((item as Row).problems as Row).title, 'Problema sem título')] : []) : []; }
function mapProblem(row: Row): AdminContentRecord | null {
  if (typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.status !== 'string') return null;
  return { id: row.id, title: row.title, summary: text(row.summary, text(row.description, 'Sem resumo')), author: text(row.author_name, 'Autor não informado'), status: row.status, category: text(row.category), region: [text(row.city, ''), text(row.state, ''), text(row.country, '')].filter(Boolean).join(', ') || 'Não informada', maturity: null, relatedProblems: [], relatedSolutionCount: null, createdAt: date(row.created_at), updatedAt: date(row.updated_at), archived: row.status === 'Arquivado' };
}
function mapSolution(row: Row): AdminContentRecord | null {
  if (typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.status !== 'string') return null;
  return { id: row.id, title: row.title, summary: text(row.summary, text(row.description, 'Sem resumo')), author: text(row.organization, text(row.author_name, 'Autor não informado')), status: row.status, category: text(row.category), region: [text(row.location, ''), text(row.country, '')].filter(Boolean).join(', ') || 'Não informada', maturity: typeof row.maturity_level === 'string' ? row.maturity_level : null, relatedProblems: relatedProblemTitles(row.solution_problems), relatedSolutionCount: null, createdAt: date(row.created_at), updatedAt: date(row.updated_at), archived: row.status === 'Arquivada' };
}

/** Read-only administrative catalog. It intentionally has no update/delete methods. */
export class AdminContentRepository {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }
  async list(kind: AdminContentKind, options: AdminContentListOptions): Promise<Result<AdminContentPage>> {
    const from = Math.max(0, options.page) * ADMIN_CONTENT_PAGE_SIZE;
    const columns = kind === 'problem'
      ? 'id,title,summary,description,author_name,status,category,city,state,country,created_at,updated_at'
      : 'id,title,summary,description,author_name,organization,status,category,maturity_level,location,country,created_at,updated_at,solution_problems(problems(title))';
    let query = this.client.from(kind === 'problem' ? 'problems' : 'solutions').select(columns, { count: 'exact' });
    const searchFilter = buildAdminContentSearchFilter(kind, options.search);
    if (searchFilter) query = query.or(searchFilter);
    if (options.status !== 'all' && adminContentStatuses(kind).includes(options.status)) query = query.eq('status', options.status);
    const { data, error, count } = await query.order('updated_at', { ascending: false }).range(from, from + ADMIN_CONTENT_PAGE_SIZE - 1);
    if (error) return { ok: false, message: safeDatabaseMessage(error, `Não foi possível carregar ${kind === 'problem' ? 'os problemas' : 'as soluções'}.`) };
    const mapper = kind === 'problem' ? mapProblem : mapSolution;
    const records = (data as unknown[] ?? []).map((row) => mapper(row as Row));
    if (records.some((record) => !record)) return { ok: false, message: 'O servidor retornou conteúdo em formato inválido.' };
    return { ok: true, data: { records: records as AdminContentRecord[], total: count ?? 0 } };
  }
}
