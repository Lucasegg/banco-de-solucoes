import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeContactForm, validateContactForm } from './validation.ts';
const valid = { name: 'Ada Lovelace', email: 'ada@example.com', subject: 'A question', category: 'question', message: 'A sufficiently long message.', consent: true, website: '' };
test('requires every field and explicit consent', () => { const errors = validateContactForm({ name: '', email: '', subject: '', category: '', message: '', consent: false, website: '' }); assert.deepEqual(Object.keys(errors).sort(), ['category', 'consent', 'email', 'message', 'name', 'subject']); });
test('validates email, lengths and allowlisted category', () => { assert.deepEqual(validateContactForm(valid), {}); assert.equal(validateContactForm({ ...valid, email: 'invalid' }).email, 'email'); assert.equal(validateContactForm({ ...valid, category: 'administrator' }).category, 'category'); assert.equal(validateContactForm({ ...valid, message: 'short' }).message, 'tooShort'); });
test('normalizes user input', () => { const value = normalizeContactForm({ ...valid, name: ' Ada   Lovelace ', email: ' ADA@EXAMPLE.COM ' }); assert.equal(value.name, 'Ada Lovelace'); assert.equal(value.email, 'ada@example.com'); });
