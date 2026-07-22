type ServiceName = 'rest' | 'auth' | 'storage';
type Environment = Record<string, string | undefined>;

const services: ReadonlyArray<{ name: ServiceName; path: string; available: string; unavailable: string }> = [
  { name: 'rest', path: '/rest/v1/', available: 'API de dados disponível.', unavailable: 'Não foi possível validar a API de dados.' },
  { name: 'auth', path: '/auth/v1/settings', available: 'Serviço de autenticação disponível.', unavailable: 'Não foi possível validar o serviço de autenticação.' },
  { name: 'storage', path: '/storage/v1/bucket', available: 'Serviço de armazenamento disponível.', unavailable: 'Não foi possível validar o serviço de armazenamento.' },
];

async function checkService(service: (typeof services)[number], baseUrl: string, headers: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}${service.path}`, { headers });
    if (response.status === 200) {
      console.log(`✓ ${service.name} — ${service.available}`);
      return true;
    }
  } catch {
    // Deliberately omit transport details: they can contain sensitive infrastructure data.
  }

  console.error(`✗ ${service.name} — ${service.unavailable}`);
  return false;
}

/**
 * Verifies only stable public service endpoints. Migration state is validated by
 * the Supabase CLI migration history in the deployment workflow, not here.
 */
export async function runDatabaseCheck(env: Environment = process.env): Promise<number> {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error('Configuração incompleta: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
    return 1;
  }

  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const baseUrl = url.replace(/\/$/, '');
  const results = await Promise.all(services.map((service) => checkService(service, baseUrl, headers)));
  return results.every(Boolean) ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await runDatabaseCheck();
