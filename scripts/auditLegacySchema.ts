import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.'); process.exitCode = 1; }
const requiredTables = ['profiles','problems','solutions','comments','favorites','reactions','contributions','contribution_audit','audit_events','notifications','problem_timeline'];
const requiredColumns = ['profiles.social_links','profiles.website','problems.source_metadata','problems.source_verified_at','problems.latitude','comments.user_id','notifications.recipient_id'];
const requiredFunctions = ['get_problem_region_summary','get_public_problem_location','write_audit_event'];

async function main() {
 if (!url || !key) return;
 const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
 // RPC executes read-only pg_catalog/information_schema queries supplied by the audited project.
 const { data, error } = await client.rpc('audit_legacy_schema');
 if (error) { console.error(`Auditoria não pôde consultar o schema: ${error.message}`); process.exitCode = 1; return; }
 const missing = Array.isArray(data?.missing) ? data.missing.map(String) : ['resposta de auditoria inválida'];
 console.log(`Tabelas auditadas: ${requiredTables.join(', ')}`);
 console.log(`Colunas auditadas: ${requiredColumns.join(', ')}`);
 console.log(`Funções auditadas: ${requiredFunctions.join(', ')}`);
 if (!data?.ok || missing.length) { console.error(`Objetos ausentes ou divergentes:\n${missing.join('\n')}`); process.exitCode = 1; return; }
 console.log('Auditoria somente leitura concluída sem divergências.');
}
void main();
