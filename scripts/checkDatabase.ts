const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !key || !token) {
  console.error('Defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_ACCESS_TOKEN de um administrador.');
  process.exitCode = 2;
} else {
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/get_system_health`, { method:'POST', headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:'{}' });
  const body = await response.text();
  if (!response.ok) { console.error(`Health check falhou (HTTP ${response.status}): ${body}`); process.exitCode=1; }
  else { const health=JSON.parse(body); console.log(JSON.stringify(health,null,2)); if(!health.ok) process.exitCode=1; }
}
