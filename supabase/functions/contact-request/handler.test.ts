import assert from 'node:assert/strict';
import test from 'node:test';
import { createContactHandler, type ContactEnvironment, type HandlerDependencies } from './handler.ts';

const origin = 'https://banco.example';
const payload = { name: 'Ana <Admin>', email: ' ANA@example.com ', subject: 'Ajuda\r\nBcc: evil', category: 'support', message: 'Mensagem com <script>alert(1)</script>', consent: true, website: '' };
const environment: ContactEnvironment = { RESEND_API_KEY: 'resend-secret', CONTACT_ADMIN_EMAIL: 'admin@server.example', CONTACT_FROM_EMAIL: 'contact@verified.example', CONTACT_ALLOWED_ORIGINS: origin };
type Harness = { handler: ReturnType<typeof createContactHandler>; sent: Array<{ input: string | URL | Request; init?: RequestInit }>; claims: string[] };
function harness(overrides: Partial<HandlerDependencies> = {}): Harness {
  const sent: Harness['sent'] = []; const claims: string[] = [];
  const dependencies: HandlerDependencies = { getEnvironment: () => environment, now: () => new Date('2026-07-29T12:00:00Z'), identify: async () => 'hashed-identifier', rateLimit: { claim: async (identifier) => { claims.push(identifier); return true; } }, fetch: async (input, init) => { sent.push({ input, init }); return new Response('{}', { status: 200 }); }, ...overrides };
  return { handler: createContactHandler(dependencies), sent, claims };
}
const request = (body: string = JSON.stringify(payload), options: { method?: string; requestOrigin?: string } = {}) => new Request('https://function.example/contact', { method: options.method ?? 'POST', headers: { origin: options.requestOrigin ?? origin, 'content-type': 'application/json' }, body: (options.method ?? 'POST') === 'POST' ? body : undefined });
async function safe(response: Response) { const text = await response.text(); assert.doesNotMatch(text, /resend-secret|admin@|ANA@example|Mensagem|script/); return text; }

test('handles allowed OPTIONS with CORS', async () => { const response = await harness().handler(request('', { method: 'OPTIONS' })); assert.equal(response.status, 204); assert.equal(response.headers.get('access-control-allow-origin'), origin); });
test('rejects an unlisted origin without reflecting it', async () => { const response = await harness().handler(request(JSON.stringify(payload), { requestOrigin: 'https://evil.example' })); assert.equal(response.status, 403); assert.equal(response.headers.get('access-control-allow-origin'), null); await safe(response); });
test('rejects non-POST methods', async () => { const response = await harness().handler(request('', { method: 'GET' })); assert.equal(response.status, 405); await safe(response); });
test('rejects invalid JSON', async () => { const response = await harness().handler(request('{')); assert.equal(response.status, 400); await safe(response); });
test('rejects invalid payload, honeypot, missing consent and manipulated category', async () => { for (const changed of [{ name: '' }, { website: 'bot' }, { consent: false }, { category: 'administrator' }]) { const response = await harness().handler(request(JSON.stringify({ ...payload, ...changed }))); assert.equal(response.status, 400); await safe(response); } });
test('returns 429 when the distributed limiter denies the claim', async () => { const response = await harness({ rateLimit: { claim: async () => false } }).handler(request()); assert.equal(response.status, 429); await safe(response); });
test('fails closed when rate limiting is unavailable', async () => { const response = await harness({ rateLimit: { claim: async () => { throw new Error('database secret'); } } }).handler(request()); assert.equal(response.status, 503); await safe(response); });
test('rejects missing server configuration before delivery', async () => { const response = await harness({ getEnvironment: () => ({ CONTACT_ALLOWED_ORIGINS: origin }) }).handler(request()); assert.equal(response.status, 503); await safe(response); });
test('maps Resend errors and network failures to safe responses', async () => { for (const fetcher of [async () => new Response('provider details', { status: 500 }), async () => { throw new Error('network secret'); }]) { const response = await harness({ fetch: fetcher }).handler(request()); assert.equal(response.status, 502); await safe(response); } });
test('sends successfully using only server addresses and sanitized user content', async () => { const state = harness(); const response = await state.handler(request(JSON.stringify({ ...payload, to: 'attacker@example.com', from: 'spoof@example.com' }))); assert.equal(response.status, 200); assert.deepEqual(JSON.parse(await response.text()), { ok: true }); assert.deepEqual(state.claims, ['hashed-identifier']); assert.equal(state.sent.length, 1); const delivery = JSON.parse(String(state.sent[0].init?.body)); assert.deepEqual(delivery.to, [environment.CONTACT_ADMIN_EMAIL]); assert.equal(delivery.from, environment.CONTACT_FROM_EMAIL); assert.equal(delivery.reply_to, 'ana@example.com'); assert.doesNotMatch(delivery.subject, /[\r\n]/); assert.match(delivery.html, /&lt;script&gt;/); assert.doesNotMatch(delivery.html, /<script>/); assert.doesNotMatch(JSON.stringify(delivery), /attacker|spoof/); });
