import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const migrationPath='supabase/migrations/20260726120000_sprint34_recommendations.sql';
const migration=readFileSync(migrationPath,'utf8');
const assertions=readFileSync('scripts/fixtures/sprint34_recommendations_assertions.sql','utf8');
const workflow=readFileSync('.github/workflows/deploy.yml','utf8');
const repository=readFileSync('src/repositories/recommendations/RecommendationRepository.ts','utf8');
const card=readFileSync('src/components/recommendations/RecommendationSection.tsx','utf8');
const fixture=readFileSync('scripts/fixtures/sprint32_search_schema.sql','utf8');
const docs=readFileSync('docs/sprint34-recommendations.md','utf8');
const hook=readFileSync('src/hooks/useRecommendations.ts','utf8');

test('distance helper is private and has safe mathematical attributes',()=>{
 const declaration=/function public\.recommendation_distance_km[\s\S]*?returns double precision language sql immutable strict parallel safe security invoker set search_path=pg_catalog/;
 assert.match(migration,declaration);
 assert.doesNotMatch(migration,/recommendation_distance_km\([^;]+grant execute/is);
 assert.match(migration,/revoke all on function public\.recommendation_distance_km\([^)]+\) from public,anon,authenticated/);
 assert.doesNotMatch(migration,/security definer/i);
});

test('three public RPCs remain invoker-safe, paginated and deterministic',()=>{
 for(const name of ['get_related_problems','get_recommended_solutions','get_related_problems_for_solution']) assert.match(migration,new RegExp(`function public\\.${name}[\\s\\S]{0,300}security invoker`));
 assert.equal((migration.match(/order by score desc,updated_at desc,id asc/g)||[]).length,3);
 assert.equal((migration.match(/least\(greatest\(coalesce\(p_limit,6\),1\),24\)/g)||[]).length,3);
 assert.equal((migration.match(/greatest\(coalesce\(p_offset,0\),0\)/g)||[]).length,3);
 assert.match(migration,/p\.id<>o\.id/); assert.match(migration,/not exists\(select 1 from public\.solution_problems/);
});

test('popularity cannot overflow an integer and remains capped',()=>{
 assert.equal((migration.match(/least\(5,ln\(1::numeric\+greatest\(coalesce\(likes,0\),0\)::numeric\)\)/g)||[]).length,3);
 assert.match(assertions,/likes,updated_at[\s\S]*2147483647/);
});

test('recommended solutions use the real organization contract, never a fictitious location column',()=>{
 const rpc=/get_recommended_solutions[\s\S]*?returns table\(id uuid,title text,summary text,category text,tags text\[\],organization text,updated_at timestamptz,recommendation_score numeric,recommendation_reasons text\[\],total_count bigint\)[\s\S]*?select id,title,summary,category,tags,organization,updated_at,score,reasons,n from numbered/;
 assert.match(migration,rpc);
 assert.doesNotMatch(migration,/\b(?:s\.)?location\b|add column(?: if not exists)? location/i);
 const solutionSchema=/create table public\.solutions \(([\s\S]*?)\n\);/.exec(fixture)?.[1]??'';
 assert.match(solutionSchema,/organization text/); assert.doesNotMatch(solutionSchema,/\blocation\b/);
 assert.match(repository,/organization\?:string/); assert.doesNotMatch(repository,/location\?:string|\.location/);
 assert.match(card,/item\.organization/); assert.match(card,/publicPlace &&/); assert.doesNotMatch(card,/item\.location/);
 assert.match(docs,/solutions\.location/); assert.match(docs,/organization/);
});

test('real SQL assertions cover recommendation behavior and privileges',()=>{
 for(const contract of ['self or archived problem returned','linked or archived solution returned','solution public contract failed','category/tags/popularity weighting failed','score or public reasons failed','candidate without coordinates omitted','maximum limit failed','negative offset failed','total_count failed','stable ordering failed','distance helper is directly executable']) assert.ok(assertions.includes(contract),`missing ${contract}`);
 assert.match(assertions,/generate_series\(1,30\)/); assert.match(assertions,/has_function_privilege\('authenticated'/); assert.match(assertions,/aclexplode/);
 assert.doesNotMatch(assertions,/p,cross join lateral/i);
 assert.match(assertions,/with ordinality/); assert.equal((assertions.match(/lag\([^)]+\) over\(order by emit_order\)/g)||[]).length,3);
 assert.ok((assertions.match(/get_related_problems\('[^']+',24,24\)/g)||[]).length>=4);
 assert.match(assertions,/count\(\*\),count\(distinct id\),min\(total_count\)/);
 assert.match(assertions,/returned_count<>reported_count or unique_count<>returned_count/);
});

test('pagination error keeps existing cards and offers retry',()=>{
 assert.match(card,/state\.error && !state\.items\.length/);
 assert.match(card,/state\.items\.map/);
 assert.match(card,/state\.error && <p role=\"alert\"[\s\S]*t\('recommendation\.moreError'\)/);
 const resources=readFileSync('src/i18n/locales/engagement.ts','utf8');
 assert.match(resources,/'recommendation\.moreError':'Não foi possível carregar mais recomendações\. Tente novamente\.'/);
 assert.match(resources,/'recommendation\.moreError':'Unable to load more recommendations\. Try again\.'/);
 assert.match(card,/state\.items\.length < state\.total[\s\S]*onClick=\{state\.loadMore\}/);
 assert.doesNotMatch(card,/state\.error\?[^:]+:[^:]*state\.items\.map/);
});

test('recommendation hook terminates safely and ignores obsolete responses',()=>{
 assert.match(hook,/if \(!RecommendationRepository\)[\s\S]*setError\(recommendationError\)[\s\S]*setLoading\(false\)/);
 assert.match(hook,/catch \{[\s\S]*setError\(recommendationError\)/);
 assert.match(hook,/finally \{[\s\S]*setLoading\(false\)/);
 assert.match(hook,/version !== requestVersion\.current/);
 assert.match(hook,/replace \? result\.data\.items : \[\.\.\.current, \.\.\.result\.data\.items\]/);
});

test('PostgreSQL 15 CI applies migration and blocking real assertions',()=>{
 const migrationCommand=`-v ON_ERROR_STOP=1 -f ${migrationPath}`;
 const assertionCommand='-v ON_ERROR_STOP=1 -f scripts/fixtures/sprint34_recommendations_assertions.sql';
 assert.ok(workflow.includes(migrationCommand)); assert.ok(workflow.includes(assertionCommand));
 assert.ok(workflow.indexOf(migrationCommand)<workflow.indexOf(assertionCommand));
 assert.match(workflow,/image: postgres:15/); assert.doesNotMatch(workflow,/continue-on-error|migration repair/i);
});

test('no migration predating Sprint 34 changed against recorded baseline',()=>{
 const safety=readFileSync('scripts/pendingMigrationsSafety.test.ts','utf8');
 for(const [file,hash] of Object.entries({'20260717240000_problem_timeline.sql':'75a547b54baf0cd97f3927cdb2f3604c1987550a5ccad4127a39e23f3fd58379','20260717250000_public_problem_map.sql':'0780657dcf32c58290f5c2be30a0a83a62becbf75667e21be2c242d719dc04ee','20260717260000_sprint26_system_health.sql':'680cc883ebe9bbdfbfb2b1f3792eeb07271764dcc83d1301394a38fc512f5316'})) assert.equal(createHash('sha256').update(readFileSync(`supabase/migrations/${file}`)).digest('hex'),hash);
 assert.match(safety,/sprint34/);
});
