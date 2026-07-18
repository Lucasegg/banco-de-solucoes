import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { sanitizeLogContext } from '../lib/logger.ts';
import { checkDatabaseHealth, EXPECTED_SCHEMA_VERSION } from './systemHealth.ts';
import { runDatabaseCheck } from '../../scripts/checkDatabase.ts';

type Failure = { message: string; code?: string };
const baseChecks = () => ['database','schema_version','required_rpcs','required_columns'].map((name) => ({ name, status:'ok' as const, message:'OK', latency_ms:1 }));
function client(options: { checks?: ReturnType<typeof baseChecks>; version?: string; rpcError?: Failure; authError?: Failure; storageError?: Failure; malformed?: boolean } = {}) {
  return {
    rpc: async () => options.rpcError ? {data:null,error:options.rpcError} : {data:options.malformed ? {ok:true} : {ok:true,schema_version:options.version ?? EXPECTED_SCHEMA_VERSION,checked_at:new Date().toISOString(),checks:options.checks ?? baseChecks()},error:null},
    auth: { getUser: async () => ({data:{user:null},error:options.authError ?? null}) },
    storage: { listBuckets: async () => ({data:[],error:options.storageError ?? null}) },
  };
}

test('Supabase não configurado',async()=>{const result=await checkDatabaseHealth(null);assert.equal(result.ok,false);assert.equal(result.checks[0]?.name,'database');});
test('health saudável contém auth, storage e latência',async()=>{const result=await checkDatabaseHealth(client() as never);assert.equal(result.ok,true);assert.ok(result.checks.some((c)=>c.name==='auth'));assert.ok(result.checks.some((c)=>c.name==='storage'));assert.equal(typeof result.checks.find((c)=>c.name==='response_time')?.latency_ms,'number');});
for (const [label,name,message] of [['RPC ausente','required_rpcs','RPC ausente'],['assinatura incompatível','required_rpcs','Assinatura incompatível'],['coluna ausente','required_columns','Coluna ausente']] as const) test(label,async()=>{const checks=baseChecks();Object.assign(checks.find((c)=>c.name===name)!,{status:'error',message});assert.equal((await checkDatabaseHealth(client({checks}) as never)).ok,false);});
test('schema incompatível é rejeitado com mensagem pública',async()=>{const result=await checkDatabaseHealth(client({version:'25.1.0'}) as never);assert.equal(result.ok,false);assert.equal(result.checks.find((c)=>c.name==='schema_version')?.message,'Versão do banco incompatível com esta versão da aplicação.');});
test('Auth indisponível é sanitizado',async()=>{const result=await checkDatabaseHealth(client({authError:{message:'JWT secreto'}}) as never);assert.equal(result.checks.find((c)=>c.name==='auth')?.message,'Não foi possível validar o serviço de autenticação.');});
test('Storage indisponível é sanitizado',async()=>{const result=await checkDatabaseHealth(client({storageError:{message:'bucket interno'}}) as never);assert.equal(result.checks.find((c)=>c.name==='storage')?.message,'Não foi possível validar o serviço de armazenamento.');});
test('erro técnico não chega ao resultado',async()=>{const result=await checkDatabaseHealth(client({rpcError:{message:'column source_metadata does not exist',code:'42703'}}) as never);assert.equal(JSON.stringify(result).includes('source_metadata'),false);});
test('resposta RPC malformada falha de forma segura',async()=>{assert.equal((await checkDatabaseHealth(client({malformed:true}) as never)).ok,false);});
test('logger remove segredos recursivamente',()=>{assert.deepEqual(sanitizeLogContext({token:'x',nested:{authorization:'y'},safe:'ok'}),{token:'[REDACTED]',nested:{authorization:'[REDACTED]'},safe:'ok'});});
test('script de CI retorna exit code de erro sem configuração',async()=>{assert.equal(await runDatabaseCheck({}),1);});
test('script exige service role e não aceita access token da CLI como JWT',async()=>{assert.equal(await runDatabaseCheck({SUPABASE_URL:'https://example.invalid',SUPABASE_ACCESS_TOKEN:'management'}),1);});
test('script de CI falha quando health.ok é false',async()=>{const original=globalThis.fetch;globalThis.fetch=(async(url: string|URL|Request)=>({ok:true,status:200,json:async()=>String(url).includes('/rpc/')?{ok:false,schema_version:EXPECTED_SCHEMA_VERSION,checked_at:new Date().toISOString(),checks:baseChecks().map((check)=>check.name==='required_rpcs'?{...check,status:'error',message:'RPC ausente'}:check)}:{}})) as typeof fetch;try{assert.equal(await runDatabaseCheck({SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only'}),1);}finally{globalThis.fetch=original;}});
test('rota admin permanece protegida',()=>{const source=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');assert.match(source,/page === 'admin-system'.*permissions\.canAccessAdmin/s);});
test('mapa usa mensagens amigáveis nas três operações',()=>{const source=readFileSync(new URL('../repositories/map/MapRepository.ts',import.meta.url),'utf8');assert.match(source,/Não foi possível atualizar o mapa/);assert.match(source,/Não foi possível carregar o resumo/);assert.match(source,/Não foi possível carregar a localização/);});
test('migration autoriza service role e admin autenticado, negando usuário comum e anon',()=>{const sql=readFileSync(new URL('../../supabase/migrations/20260717260000_sprint26_system_health.sql',import.meta.url),'utf8');assert.match(sql,/auth\.role\(\) is distinct from 'service_role' and not coalesce\(public\.is_admin\(\), false\)/);assert.match(sql,/grant execute.*authenticated/);assert.match(sql,/grant execute.*service_role/);assert.doesNotMatch(sql,/grant execute.*anon/);});
test('workflow separa PR de migrations, health e deploy',()=>{const workflow=readFileSync(new URL('../../.github/workflows/deploy.yml',import.meta.url),'utf8');const migrate=workflow.indexOf('Apply database migrations');const health=workflow.indexOf('Validate production database health');assert.ok(migrate>0&&health>migrate);assert.match(workflow,/migrate-and-health:\n    if: github\.event_name == 'push'/);assert.match(workflow,/deploy:[\s\S]*needs: migrate-and-health/);assert.doesNotMatch(workflow,/VITE_SUPABASE_(ACCESS_TOKEN|SERVICE_ROLE_KEY|DB_PASSWORD)/);});
