import { buildEmail, validatePayload } from './core.ts';

export type ContactEnvironment = { RESEND_API_KEY?: string; CONTACT_ADMIN_EMAIL?: string; CONTACT_FROM_EMAIL?: string; CONTACT_ALLOWED_ORIGINS?: string };
export type RateLimitClient = { claim(identifier: string, now: Date): Promise<boolean> };
export type HandlerDependencies = { getEnvironment(): ContactEnvironment; rateLimit: RateLimitClient; fetch: typeof fetch; now(): Date; identify(request: Request): Promise<string> };

const json = (status: number, headers: HeadersInit = {}, body: Record<string, unknown> = { error: 'request_not_processed' }) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'content-type': 'application/json' } });
const cors = (origin: string) => ({ 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'Origin' });

export function createContactHandler(dependencies: HandlerDependencies) {
  return async (request: Request): Promise<Response> => {
    const environment = dependencies.getEnvironment();
    const origin = request.headers.get('origin') ?? '';
    const origins = (environment.CONTACT_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    if (!origins.includes(origin)) return json(403);
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json(405, headers);
    let raw: unknown;
    try { raw = await request.json(); } catch { return json(400, headers); }
    if (!raw || typeof raw !== 'object') return json(400, headers);
    const contact = validatePayload(raw);
    if (!contact) return json(400, headers);
    if (!environment.RESEND_API_KEY || !environment.CONTACT_ADMIN_EMAIL || !environment.CONTACT_FROM_EMAIL) return json(503, headers);
    let allowed: boolean;
    try { allowed = await dependencies.rateLimit.claim(await dependencies.identify(request), dependencies.now()); }
    catch { return json(503, headers); }
    if (!allowed) return json(429, headers);
    const email = buildEmail(contact, dependencies.now());
    try {
      const response = await dependencies.fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${environment.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: environment.CONTACT_FROM_EMAIL, to: [environment.CONTACT_ADMIN_EMAIL], reply_to: contact.email, subject: email.subject, html: email.html }) });
      if (!response.ok) return json(502, headers);
    } catch { return json(502, headers); }
    return json(200, headers, { ok: true });
  };
}
