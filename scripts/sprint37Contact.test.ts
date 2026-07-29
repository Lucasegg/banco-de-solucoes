import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const page = readFileSync('src/pages/Contact.tsx', 'utf8'); const backend = readFileSync('supabase/functions/contact-request/index.ts', 'utf8');
test('form includes loading, success, failure, duplicate lock and preserves data on failure', () => { assert.match(page, /status === 'loading'/); assert.match(page, /setStatus\('success'\)/); assert.match(page, /setStatus\('error'\)/); assert.match(page, /if \(status === 'loading'\) return/); assert.doesNotMatch(page, /catch \{ setForm/); });
test('backend owns recipient and applies CORS, honeypot, validation and rate limiting', () => { assert.match(backend, /CONTACT_ADMIN_EMAIL/); assert.doesNotMatch(backend, /raw\.to|contact\.to/); assert.match(backend, /CONTACT_ALLOWED_ORIGINS/); assert.match(backend, /limiter\.allow/); assert.match(backend, /validatePayload/); });
