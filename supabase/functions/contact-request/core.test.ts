import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEmail, RateLimiter, validatePayload } from './core.ts';

const valid = { name: '  Ana  Silva ', email: ' ANA@example.com ', subject: ' Preciso de ajuda ', category: 'support', message: 'Mensagem suficientemente longa', consent: true, website: '' };
test('validates, normalizes and rejects manipulated fields', () => { assert.deepEqual(validatePayload(valid), { name: 'Ana Silva', email: 'ana@example.com', subject: 'Preciso de ajuda', category: 'support', message: valid.message }); assert.equal(validatePayload({ ...valid, category: 'admin' }), null); assert.equal(validatePayload({ ...valid, consent: false }), null); assert.equal(validatePayload({ ...valid, website: 'bot' }), null); assert.deepEqual(validatePayload({ ...valid, to: 'attacker@example.com' } as typeof valid), validatePayload(valid)); });
test('escapes HTML and strips header newlines', () => { const contact = validatePayload({ ...valid, name: '<img onerror=x>', subject: 'hello\r\nBcc: bad' }); assert.ok(contact); const email = buildEmail(contact, new Date('2026-07-29T00:00:00Z')); assert.match(email.html, /&lt;img onerror=x&gt;/); assert.doesNotMatch(email.html, /<img/); assert.doesNotMatch(email.subject, /[\r\n]/); });
test('rate limits by key and resets after the window', () => { const limiter = new RateLimiter(2, 100); assert.equal(limiter.allow('ip', 0), true); assert.equal(limiter.allow('ip', 1), true); assert.equal(limiter.allow('ip', 2), false); assert.equal(limiter.allow('ip', 101), true); });
