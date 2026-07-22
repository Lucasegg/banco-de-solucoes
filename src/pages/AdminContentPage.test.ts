import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { filterAdminContent } from '../components/admin/content/filterAdminContent.ts';

const records = [{ title: 'Água limpa', summary: 'Resumo da solução', author: 'Ana @ana', status: 'Arquivada', category: 'Meio Ambiente', region: 'São Paulo, SP', maturity: 'Piloto', relatedProblems: ['Poluição do rio'] }];
test('busca administrativa é case-insensitive e considera campos seguros relacionados', () => {
  assert.equal(filterAdminContent(records, 'ANA', 'all').length, 1);
  assert.equal(filterAdminContent(records, 'rio', 'all').length, 1);
  assert.equal(filterAdminContent(records, 'inexistente', 'all').length, 0);
});
test('filtro administrativo usa apenas status retornados pelo backend', () => {
  assert.equal(filterAdminContent(records, '', 'Arquivada').length, 1);
  assert.equal(filterAdminContent(records, '', 'Proposta').length, 0);
});
test('rotas de conteúdo são protegidas e dashboard direciona às páginas próprias', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('./AdminDashboard.tsx', import.meta.url), 'utf8');
  assert.match(app, /<AdminProblems onBack=/); assert.match(app, /<AdminSolutions onBack=/);
  assert.match(app, /<AdminRoute[^>]*isAdmin=\{permissions\.canAccessAdmin\}/);
  assert.match(dashboard, /destination: 'admin-problems'/); assert.match(dashboard, /destination: 'admin-solutions'/);
});
test('repositório administrativo é somente leitura e limitado por página', () => {
  const source = readFileSync(new URL('../repositories/adminContent/AdminContentRepository.ts', import.meta.url), 'utf8');
  assert.match(source, /ADMIN_CONTENT_PAGE_SIZE = 25/); assert.match(source, /\.range\(from, from \+ ADMIN_CONTENT_PAGE_SIZE - 1\)/);
  assert.doesNotMatch(source, /\.update\(/); assert.doesNotMatch(source, /\.delete\(/); assert.doesNotMatch(source, /service_role/i);
});
