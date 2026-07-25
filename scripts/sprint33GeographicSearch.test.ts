import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260725120000_sprint33_geographic_search.sql';
const migration = readFileSync(migrationPath, 'utf8');
const fixture = readFileSync('scripts/fixtures/sprint32_search_schema.sql', 'utf8');
const runtime = readFileSync('scripts/fixtures/sprint33_geographic_assertions.sql', 'utf8');
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const repository = readFileSync('src/repositories/search/SearchRepository.ts', 'utf8');
const page = readFileSync('src/pages/Search.tsx', 'utf8');
const map = readFileSync('src/components/map/NearbyResultsMap.tsx', 'utf8');
const distance = (aLat:number,aLon:number,bLat:number,bLon:number) => { const rad=(n:number)=>n*Math.PI/180; const h=Math.sin(rad(bLat-aLat)/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(rad(bLon-aLon)/2)**2; return 6371.0088*2*Math.asin(Math.min(1,Math.sqrt(h))); };

const problemSignature = 'double precision,double precision,double precision,text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,integer,integer';
const solutionSignature = 'double precision,double precision,double precision,text,text,text,text[],uuid,timestamptz,timestamptz,boolean,boolean,boolean,boolean,integer,integer';

test('Haversine covers zero distance and a known São Paulo–Rio route',()=>{
  assert.equal(distance(-23.55,-46.63,-23.55,-46.63),0);
  assert.ok(Math.abs(distance(-23.5505,-46.6333,-22.9068,-43.1729)-360.75)<1);
  assert.match(runtime,/haversine_distance_km\(-23\.5505,-46\.6333,-23\.5505,-46\.6333\) <> 0/);
  assert.match(runtime,/360\.75/);
});

test('RPC signatures, coordinate validation, radius and bounded pagination are explicit',()=>{
  assert.match(migration,new RegExp(`search_nearby_problems\\(${problemSignature.replace(/[\[\]]/g,'\\$&')}`));
  assert.match(migration,new RegExp(`search_nearby_solutions\\(${solutionSignature.replace(/[\[\]]/g,'\\$&')}`));
  assert.equal((migration.match(/p_latitude not between -90 and 90/g)||[]).length,2);
  assert.equal((migration.match(/p_longitude not between -180 and 180/g)||[]).length,2);
  assert.equal((migration.match(/p_radius_km <= 0 or p_radius_km > 100/g)||[]).length,2);
  assert.equal((migration.match(/limit least\(greatest\(coalesce\(p_limit,20\),1\),50\) offset greatest\(coalesce\(p_offset,0\),0\)/g)||[]).length,2);
});

test('radius, exclusion, stable order, maximum radius and pagination execute in PostgreSQL assertions',()=>{
  assert.equal((migration.match(/where distance <= radius/g)||[]).length,2);
  assert.equal((migration.match(/order by n\.distance,n\.id/g)||[]).length,2);
  for(const contract of ['radius/text/category/order or coordinate exclusion failed','p_limit=>1,p_offset=>1',',100,p_limit=>50,p_offset=>0','total <> 3']) assert.ok(runtime.includes(contract),`runtime SQL missing ${contract}`);
  assert.match(runtime,/00000000-0000-0000-0000-000000000003[\s\S]*00000000-0000-0000-0000-000000000004/);
  assert.match(runtime,/00000000-0000-0000-0000-000000000007[\s\S]*00000000-0000-0000-0000-000000000008/);
});

test('problem privacy projection and solution-owned coordinates remain distinct',()=>{
  assert.match(migration,/public_problem_coordinate\(p\.latitude,p\.geolocation_precision\) public_latitude/);
  assert.match(migration,/public_problem_coordinate\(p\.longitude,p\.geolocation_precision\) public_longitude/);
  assert.match(migration,/haversine_distance_km\(p_latitude,p_longitude,c\.latitude,c\.longitude\)/);
  assert.match(fixture,/create or replace function public\.public_problem_coordinate\(value double precision, precision text\)/);
  assert.match(fixture,/geolocation_precision text/);
  const preSprint33Solutions = /create table public\.solutions \(([\s\S]*?)\n\);/.exec(fixture)?.[1] ?? '';
  assert.doesNotMatch(preSprint33Solutions,/latitude|longitude/);
});

test('grants expose only nearby RPCs and keep Haversine private',()=>{
  assert.match(migration,new RegExp(`grant execute on function public\\.search_nearby_problems\\(${problemSignature.replace(/[\[\]]/g,'\\$&')}\\) to anon,authenticated`));
  assert.match(migration,new RegExp(`grant execute on function public\\.search_nearby_solutions\\(${solutionSignature.replace(/[\[\]]/g,'\\$&')}\\) to anon,authenticated`));
  assert.match(migration,/revoke all on function public\.haversine_distance_km\([^)]+\) from public,anon,authenticated/);
  assert.doesNotMatch(migration,/grant execute on function public\.haversine_distance_km/);
});

test('PostgreSQL 15 workflow applies both real migrations and blocks on runtime assertions',()=>{
  const sprint32 = '-v ON_ERROR_STOP=1 -f supabase/migrations/20260723120000_sprint32_advanced_search.sql';
  const sprint33 = `-v ON_ERROR_STOP=1 -f ${migrationPath}`;
  const assertions = '-v ON_ERROR_STOP=1 -f scripts/fixtures/sprint33_geographic_assertions.sql';
  for(const command of [sprint32,sprint33,assertions]) assert.ok(workflow.includes(command),`workflow missing ${command}`);
  assert.ok(workflow.indexOf(sprint32)<workflow.indexOf(sprint33) && workflow.indexOf(sprint33)<workflow.indexOf(assertions));
  assert.match(workflow,/image: postgres:15/);
  assert.doesNotMatch(workflow,/continue-on-error/);
  assert.match(workflow,/deploy:[\s\S]*needs: migrate-and-health/);
  for(const object of ['solutions.latitude','solutions.longitude','solutions_geolocation_pair_check','problems_geographic_search_idx','solutions_geographic_search_idx','haversine_distance_km','search_nearby_problems','search_nearby_solutions','indisvalid','provolatile','proparallel']) assert.ok(runtime.includes(object),`runtime object check missing ${object}`);
});

test('frontend sends coordinates and exposes every supported radius and map',()=>{
  assert.match(repository,/\.rpc\('search_nearby_problems'/); assert.match(repository,/\.rpc\('search_nearby_solutions'/);
  for(const radius of [1,5,10,25,50,100]) assert.match(page,new RegExp(`(?:\\[|, )${radius}(?:,|\\])`));
  assert.match(page,/Perto de mim/); assert.match(page,/navigator\.geolocation/);
  assert.match(map,/tile\.openstreetmap\.org/); assert.match(map,/distance_km/);
});
