import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDatabaseHealth } from './systemHealth.ts';
test('reports configuration error without Supabase',async()=>{const result=await checkDatabaseHealth(null);assert.equal(result.ok,false);assert.equal(result.checks[0]?.name,'configuration');});
test('aggregates successful diagnostics',async()=>{const client={rpc:async()=>({data:{ok:true,schema_version:'26.0.0',checks:[{name:'database',status:'ok',message:'OK'}]},error:null})};const result=await checkDatabaseHealth(client as never);assert.equal(result.ok,true);assert.equal(result.schemaVersion,'26.0.0');});
