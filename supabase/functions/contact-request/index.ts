import { buildEmail, RateLimiter, validatePayload } from './core.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void };
const limiter = new RateLimiter();
const safeError = (status: number, headers: HeadersInit) => new Response(JSON.stringify({ error: 'request_not_processed' }), { status, headers: { ...headers, 'content-type': 'application/json' } });
const corsHeaders = (origin: string) => ({ 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'Origin' });

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') ?? '';
  const allowedOrigins = (Deno.env.get('CONTACT_ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!allowedOrigins.includes(origin)) return safeError(403, {});
  const headers = corsHeaders(origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return safeError(405, headers);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!limiter.allow(ip)) return safeError(429, headers);
  let raw: unknown;
  try { raw = await request.json(); } catch { return safeError(400, headers); }
  if (!raw || typeof raw !== 'object') return safeError(400, headers);
  const contact = validatePayload(raw);
  if (!contact) return safeError(400, headers);
  const apiKey = Deno.env.get('RESEND_API_KEY'); const recipient = Deno.env.get('CONTACT_ADMIN_EMAIL'); const from = Deno.env.get('CONTACT_FROM_EMAIL');
  if (!apiKey || !recipient || !from) return safeError(503, headers);
  const email = buildEmail(contact, new Date());
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [recipient], reply_to: contact.email, subject: email.subject, html: email.html }) });
    if (!response.ok) return safeError(502, headers);
  } catch { return safeError(502, headers); }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...headers, 'content-type': 'application/json' } });
});
