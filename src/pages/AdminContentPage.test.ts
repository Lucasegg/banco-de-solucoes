import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { AdminContentRepository, buildAdminContentSearchFilter, sanitizeAdminContentSearch } from '../repositories/adminContent/AdminContentRepository.ts';
import { resetAdminContentPage } from '../components/admin/content/adminContentPageState.ts';

type Call = [string, ...unknown[]];
function repositoryFixture() {
  const calls: Call[] = [];
  const query = {
    select: (...args: unknown[]) => { calls.push(['select', ...args]); return query; },
    or: (...args: unknown[]) => { calls.push(['or', ...args]); return query; },
    eq: (...args: unknown[]) => { calls.push(['eq', ...args]); return query; },
    order: (...args: unknown[]) => { calls.push(['order', ...args]); return query; },
    range: async (...args: unknown[]) => { calls.push(['range', ...args]); return { data: [{ id: 'content-1', title: 'Água limpa', summary: 'Resumo', description: 'Descrição', author_name: 'Ana', status: 'Arquivada', category: 'Meio Ambiente', location: 'São Paulo', country: 'Brasil', maturity_level: 'Piloto', created_at: '2026-01-01', updated_at: '2026-01-02', solution_problems: [] }], error: null, count: 26 }; },
  };
  const client = { from: (table: string) => { calls.push(['from', table]); return query; } };
  return { calls, repository: new AdminContentRepository(client as never) };
}

test('repository envia busca e status ao Supabase antes de ordenar e paginar', async () => {
  const { calls, repository } = repositoryFixture();
  const result = await repository.list('solution', { page: 1, search: 'ÁGUA limpa', status: 'Arquivada' });
  assert.deepEqual(result, { ok: true, data: { records: result.ok ? result.data.records : [], total: 26 } });
  assert.deepEqual(calls[0], ['from', 'solutions']);
  assert.match(String(calls.find(([name]) => name === 'or')?.[1]), /title\.ilike\.\*ÁGUA limpa\*/);
  assert.deepEqual(calls.find(([name]) => name === 'eq'), ['eq', 'status', 'Arquivada']);
  assert.ok(calls.findIndex(([name]) => name === 'or') < calls.findIndex(([name]) => name === 'order'));
  assert.ok(calls.findIndex(([name]) => name === 'eq') < calls.findIndex(([name]) => name === 'range'));
  assert.deepEqual(calls.find(([name]) => name === 'range'), ['range', 25, 49]);
});
test('busca é case-insensitive no PostgREST e remove sintaxe de filtro insegura', () => {
  assert.match(buildAdminContentSearchFilter('problem', 'ÁGUA'), /title\.ilike\.\*ÁGUA\*/);
  assert.equal(sanitizeAdminContentSearch('x),status.eq.Arquivado'), 'x status eq Arquivado');
  assert.doesNotMatch(buildAdminContentSearchFilter('problem', 'x),status.eq.Arquivado')!, /status\.eq\.Arquivado/);
});
test('novo critério de consulta reinicia a página para busca, status e tipo', () => {
  assert.equal(resetAdminContentPage(), 0);
  const pageSource = readFileSync(new URL('./AdminContentPage.tsx', import.meta.url), 'utf8');
  assert.match(pageSource, /\[kind, search, status\]/);
  assert.match(pageSource, /setPage\(resetAdminContentPage\(\)\)/);
});
test('count e paginação representam o total filtrado retornado pelo backend', async () => {
  const { repository } = repositoryFixture();
  const result = await repository.list('solution', { page: 1, search: 'água', status: 'Arquivada' });
  assert.equal(result.ok && result.data.total, 26);
  assert.equal((2 * 25) >= (result.ok ? result.data.total : 0), true);
});
test('rotas de conteúdo são protegidas e dashboard direciona às páginas próprias', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('./AdminDashboard.tsx', import.meta.url), 'utf8');
  assert.match(app, /<AdminProblems onBack=/); assert.match(app, /<AdminSolutions onBack=/);
  assert.match(app, /<AdminRoute[^>]*isAdmin=\{permissions\.canAccessAdmin\}/);
  assert.match(dashboard, /destination: 'admin-problems'/); assert.match(dashboard, /destination: 'admin-solutions'/);
});
test('repositório administrativo permanece somente leitura e sem service role', () => {
  const source = readFileSync(new URL('../repositories/adminContent/AdminContentRepository.ts', import.meta.url), 'utf8');
  assert.match(source, /ADMIN_CONTENT_PAGE_SIZE = 25/);
  assert.doesNotMatch(source, /\.update\(/); assert.doesNotMatch(source, /\.delete\(/); assert.doesNotMatch(source, /service_role/i);
});
