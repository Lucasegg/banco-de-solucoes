import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260725120000_sprint33_geographic_search.sql', 'utf8');
const repository = readFileSync('src/repositories/search/SearchRepository.ts', 'utf8');
const page = readFileSync('src/pages/Search.tsx', 'utf8');
const map = readFileSync('src/components/map/NearbyResultsMap.tsx', 'utf8');
const distance = (aLat:number,aLon:number,bLat:number,bLon:number) => { const rad=(n:number)=>n*Math.PI/180; const h=Math.sin(rad(bLat-aLat)/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(rad(bLon-aLon)/2)**2; return 6371.0088*2*Math.asin(Math.min(1,Math.sqrt(h))); };

test('Haversine distance handles identity and a known route',()=>{ assert.equal(distance(-23.55,-46.63,-23.55,-46.63),0); assert.ok(Math.abs(distance(-23.5505,-46.6333,-22.9068,-43.1729)-360.75)<1); });
test('nearby RPCs enforce radius, deterministic distance ordering and pagination',()=>{ for(const rpc of ['search_nearby_problems','search_nearby_solutions']) assert.match(migration,new RegExp(`function public\\.${rpc}`)); assert.equal((migration.match(/where distance <= radius/g)||[]).length,2); assert.equal((migration.match(/order by n\.distance,n\.id/g)||[]).length,2); assert.equal((migration.match(/limit least\(greatest\(coalesce\(p_limit,20\),1\),50\) offset greatest\(coalesce\(p_offset,0\),0\)/g)||[]).length,2); assert.match(migration,/p_radius_km > 100/); });
test('nearby searches combine bounding indexes and text/catalogue filters',()=>{ assert.match(migration,/problems_geographic_search_idx/); assert.match(migration,/solutions_geographic_search_idx/); assert.equal((migration.match(/safe_search_tsquery\(p_query\)/g)||[]).length,2); for(const filter of ['p_category','p_tags','p_status','p_state','p_city','p_organization','p_problem_id']) assert.match(migration,new RegExp(filter)); assert.doesNotMatch(migration,/create extension/i); });
test('frontend sends coordinates and exposes every supported radius and map',()=>{ assert.match(repository,/\.rpc\('search_nearby_problems'/); assert.match(repository,/\.rpc\('search_nearby_solutions'/); for(const radius of [1,5,10,25,50,100]) assert.match(page,new RegExp(`(?:\\[|, )${radius}(?:,|\\])`)); assert.match(page,/Perto de mim/); assert.match(page,/navigator\.geolocation/); assert.match(map,/tile\.openstreetmap\.org/); assert.match(map,/distance_km/); });
