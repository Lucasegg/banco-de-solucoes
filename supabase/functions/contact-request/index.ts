import { hmacIdentifier } from './core.ts';
import { createContactHandler } from './handler.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void };
const getEnvironment = () => ({ RESEND_API_KEY: Deno.env.get('RESEND_API_KEY'), CONTACT_ADMIN_EMAIL: Deno.env.get('CONTACT_ADMIN_EMAIL'), CONTACT_FROM_EMAIL: Deno.env.get('CONTACT_FROM_EMAIL'), CONTACT_ALLOWED_ORIGINS: Deno.env.get('CONTACT_ALLOWED_ORIGINS') });
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const rateLimitSecret = Deno.env.get('CONTACT_RATE_LIMIT_SECRET') ?? '';

const handler = createContactHandler({
  getEnvironment,
  fetch,
  now: () => new Date(),
  identify: async (request) => {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    return hmacIdentifier(forwarded, rateLimitSecret);
  },
  rateLimit: { claim: async (identifier, now) => {
    if (!supabaseUrl || !serviceRoleKey || !rateLimitSecret) throw new Error('rate_limit_unavailable');
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_contact_rate_limit`, { method: 'POST', headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_identifier_hash: identifier, p_now: now.toISOString() }) });
    if (!response.ok) throw new Error('rate_limit_unavailable');
    return await response.json() === true;
  } },
});

Deno.serve(handler);
