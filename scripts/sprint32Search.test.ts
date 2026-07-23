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
