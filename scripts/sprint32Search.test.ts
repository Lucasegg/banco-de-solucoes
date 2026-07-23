import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260723120000_sprint32_advanced_search.sql', 'utf8');
const page = readFileSync('src/pages/Search.tsx', 'utf8');
const repository = readFileSync('src/repositories/search/SearchRepository.ts', 'utf8');
const hook = readFileSync('src/hooks/useSearch.ts', 'utf8');
test('Sprint 32 search contracts are server-side and public-safe', () => {
  assert.match(migration, /search_problems/); assert.match(migration, /search_solutions/);
  assert.match(migration, /auth\.uid\(\)/); assert.match(migration, /websearch_to_tsquery/);
  assert.match(migration, /least\(greatest\(coalesce\(p_limit,20\),1\),50\)/);
  assert.match(migration, /greatest\(coalesce\(p_offset,0\),0\)/);
  assert.doesNotMatch(migration, /service_role/i); assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
  assert.match(page, /aria-live/); assert.match(hook, /350/); assert.match(page, /known = new Set/);
  assert.match(repository, /\.rpc\('search_/); assert.doesNotMatch(page, /\.from\(/);
  assert.match(repository, /canonicalUuid.*\^\[0-9a-f\]/);
  assert.match(repository, /p_problem_id: canonicalUuid\(filters.problemId\)/);
  assert.match(migration, /safe_search_tsquery[\s\S]*exception when others/);
  assert.match(migration, /p_sort='relevance' and nullif\(btrim\(p_query\),''\) is null then 'recent'/);
  assert.match(migration, /p\.status <> 'Arquivado'/); assert.match(migration, /s\.status <> 'Arquivada'/);
  assert.match(migration, /p\.summary/); assert.match(migration, /s\.evidence_links/);
});

test('Sprint 32 search documents use an immutable, private tag helper', () => {
  const helper = /create or replace function public\.search_tags_text\(p_tags text\[\]\)[\s\S]*?\$\$;/.exec(migration)?.[0] ?? '';
  assert.match(helper, /returns text/);
  assert.match(helper, /language sql/);
  assert.match(helper, /immutable/);
  assert.match(helper, /parallel safe/);
  assert.match(helper, /set search_path = pg_catalog/);
  assert.match(helper, /coalesce\(array_to_string\(p_tags, ' '\), ''\)/);
  assert.doesNotMatch(helper, /\bfrom\b/i, 'the helper must not query tables');
  assert.match(migration, /revoke all on function public\.search_tags_text\(text\[\]\) from public, anon, authenticated/);
  const indexAndRpcDocuments = migration
    .replace(helper, '')
    .replace(/--[^\n]*/g, '');
  assert.doesNotMatch(indexAndRpcDocuments, /array_to_string\(/i, 'indexes and RPCs must not call array_to_string directly');
});

test('Sprint 32 indexed search documents remain null-safe and equivalent to @@ documents', () => {
  const compact = migration.replace(/\s+/g, ' ');
  const problemDocument = "setweight(to_tsvector('portuguese', coalesce(p.title, '')), 'A') || setweight(to_tsvector('portuguese', coalesce(p.summary, '')), 'B') || setweight(to_tsvector('portuguese', coalesce(p.description, '')), 'C') || setweight(to_tsvector('portuguese', coalesce(p.category, '') || ' ' || coalesce(p.city, '') || ' ' || coalesce(p.state, '') || ' ' || public.search_tags_text(p.tags)), 'D')";
  const solutionDocument = "setweight(to_tsvector('portuguese', coalesce(s.title, '')), 'A') || setweight(to_tsvector('portuguese', coalesce(s.summary, '')), 'B') || setweight(to_tsvector('portuguese', coalesce(s.description, '')), 'C') || setweight(to_tsvector('portuguese', coalesce(s.category, '') || ' ' || coalesce(s.organization, '') || ' ' || coalesce(s.impact_metric, '') || ' ' || public.search_tags_text(s.tags)), 'D')";
  for (const document of [problemDocument, solutionDocument]) {
    assert.ok(compact.includes(document), `missing relevance document: ${document}`);
    assert.ok(compact.includes(`(${document}) @@ q.tsq`), `@@ document must match relevance document: ${document}`);
    assert.match(document, /public\.search_tags_text\(/);
    assert.match(document, /coalesce\(/);
  }
  assert.match(compact, /problems_search_document_idx[\s\S]*?coalesce\(title, ''\)[\s\S]*?public\.search_tags_text\(tags\)/);
  assert.match(compact, /solutions_search_document_idx[\s\S]*?coalesce\(title, ''\)[\s\S]*?public\.search_tags_text\(tags\)/);
});
