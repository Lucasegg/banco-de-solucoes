const EXPECTED_SCHEMA_VERSION = '26.0.0';
type Check = { name: string; status: 'ok' | 'error'; message: string; latency_ms?: number };
type Health = { ok: boolean; schema_version: string | null; checked_at: string; checks: Check[] };
type Environment = Record<string, string | undefined>;

function validHealth(value: unknown): value is Health {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const required = ['database', 'schema_version', 'required_rpcs', 'required_columns'];
  return typeof row.ok === 'boolean' && (typeof row.schema_version === 'string' || row.schema_version === null) && typeof row.checked_at === 'string' && Array.isArray(row.checks) && row.checks.every((item) => item && typeof item === 'object' && typeof item.name === 'string' && (item.status === 'ok' || item.status === 'error') && typeof item.message === 'string') && required.every((name) => (row.checks as Check[]).some((check) => check.name === name));
}

async function readonlyServiceCheck(name: 'auth' | 'storage', endpoint: string, headers: Record<string, string>): Promise<Check> {
  const start = performance.now();
  try {
    const response = await fetch(endpoint, { headers });
    return response.ok
      ? { name, status: 'ok', message: name === 'auth' ? 'Serviço de autenticação disponível.' : 'Serviço de armazenamento disponível.', latency_ms: Math.round(performance.now() - start) }
      : { name, status: 'error', message: name === 'auth' ? 'Não foi possível validar o serviço de autenticação.' : 'Não foi possível validar o serviço de armazenamento.', latency_ms: Math.round(performance.now() - start) };
  } catch {
    return { name, status: 'error', message: name === 'auth' ? 'Não foi possível validar o serviço de autenticação.' : 'Não foi possível validar o serviço de armazenamento.', latency_ms: Math.round(performance.now() - start) };
  }
}

export async function runDatabaseCheck(env: Environment = process.env): Promise<number> {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!url || !key || !token) { console.error('Configuração incompleta: defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_ACCESS_TOKEN.'); return 1; }
  const base = url.replace(/\/$/, '');
  const headers = { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    const started = performance.now();
    const [rpcResponse, auth, storage] = await Promise.all([
      fetch(`${base}/rest/v1/rpc/get_system_health`, { method: 'POST', headers, body: '{}' }),
      readonlyServiceCheck('auth', `${base}/auth/v1/user`, headers),
      readonlyServiceCheck('storage', `${base}/storage/v1/bucket`, headers),
    ]);
    if (!rpcResponse.ok) { console.error(`✗ database — diagnóstico indisponível (HTTP ${rpcResponse.status})`); return 1; }
    const value: unknown = await rpcResponse.json();
    if (!validHealth(value)) { console.error('✗ database — resposta de diagnóstico inválida'); return 1; }
    const checks = [...value.checks.filter((check) => check.name !== 'auth' && check.name !== 'storage' && check.name !== 'response_time'), auth, storage];
    const latency = Math.round(performance.now() - started);
    checks.push({ name: 'response_time', status: 'ok', message: `Diagnóstico concluído em ${latency} ms.`, latency_ms: latency });
    if (value.schema_version !== EXPECTED_SCHEMA_VERSION) {
      const schema = checks.find((check) => check.name === 'schema_version');
      if (schema) Object.assign(schema, { status: 'error', message: 'Versão do banco incompatível com esta versão da aplicação.' });
    }
    for (const check of checks) console.log(`${check.status === 'ok' ? '✓' : '✗'} ${check.name}${check.status === 'error' ? ` — ${check.message}` : ''}`);
    const healthy = value.ok === true && value.schema_version === EXPECTED_SCHEMA_VERSION && checks.every((check) => check.status === 'ok');
    console.log(`\nSchema: ${value.schema_version ?? 'indisponível'}\nStatus: ${healthy ? 'saudável' : 'não saudável'}`);
    return healthy ? 0 : 1;
  } catch { console.error('✗ database — não foi possível concluir o diagnóstico'); return 1; }
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await runDatabaseCheck();
