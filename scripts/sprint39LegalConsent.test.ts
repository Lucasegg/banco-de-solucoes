import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import { selectCurrentLegalAcceptance } from '../src/legal/selectCurrentAcceptance.ts';
import type { LegalConsentStatus } from '../src/types/legalConsent.ts';

let vite: ViteDevServer;
before(async () => { vite = await createServer({ appType: 'custom', server: { middlewareMode: true } }); });
after(async () => { await vite.close(); });
const read = (path: string) => readFileSync(path, 'utf8');
const current = (pending: boolean): LegalConsentStatus => ({ requiredVersions: { terms: 'terms-2026-07-29', privacy: 'privacy-2026-07-29' }, acceptances: [], pending });

test('gate decision is fail-closed for every state and bypass wins', async () => {
  const { resolveLegalConsentGateMode: resolve } = await vite.ssrLoadModule('/src/components/legal/LegalConsentGate.tsx');
  assert.equal(resolve(true, { state: 'error', status: null }), 'bypass');
  assert.equal(resolve(false, { state: 'idle', status: null }), 'loading');
  assert.equal(resolve(false, { state: 'loading', status: null }), 'loading');
  assert.equal(resolve(false, { state: 'error', status: null }), 'error');
  assert.equal(resolve(false, { state: 'ready', status: null }), 'loading');
  assert.equal(resolve(false, { state: 'ready', status: current(true) }), 'consent');
  assert.equal(resolve(false, { state: 'ready', status: current(false) }), 'granted');
});

async function renderPrompt(mode: 'loading' | 'error' | 'consent') {
  const [{ I18nProvider }, { LegalConsentPrompt }] = await Promise.all([vite.ssrLoadModule('/src/i18n/I18nProvider.tsx'), vite.ssrLoadModule('/src/components/legal/LegalConsentGate.tsx')]);
  return renderToStaticMarkup(createElement(I18nProvider, { initialLocale: 'pt-BR' }, createElement(LegalConsentPrompt, { mode, locale: 'pt-BR', onAccept: async () => true, onRetry: async () => undefined, onLogout: async () => undefined })));
}

test('rendered safe states expose loading/error actions without a nested main', async () => {
  const loading = await renderPrompt('loading'); const error = await renderPrompt('error');
  assert.ok(loading.startsWith('<section ')); assert.ok(loading.includes('role="status"')); assert.ok(loading.includes('Sair'));
  assert.ok(error.includes('role="alert"')); assert.ok(error.includes('Tentar novamente')); assert.ok(error.includes('Sair'));
  assert.ok(!loading.includes('<main')); assert.ok(!error.includes('<main'));
});

test('consent form starts unchecked and disabled and uses real legal links', async () => {
  const html = await renderPrompt('consent');
  assert.ok(html.includes('type="checkbox"')); assert.ok(!html.includes('checked=""'));
  assert.ok(html.includes('<button disabled=""')); assert.ok(html.includes('href="#/terms"')); assert.ok(html.includes('href="#/privacy"'));
  assert.ok(!html.includes('<main'));
});

test('account selects only the currently required acceptance', () => {
  const status: LegalConsentStatus = { ...current(false), acceptances: [
    { documentType: 'terms', documentVersion: 'terms-2025-01-01', locale: 'pt-BR', acceptedAt: '2025-01-01T00:00:00Z' },
    { documentType: 'terms', documentVersion: 'terms-2026-07-29', locale: 'en-US', acceptedAt: '2026-07-29T00:00:00Z' },
  ] };
  assert.equal(selectCurrentLegalAcceptance(status, 'terms')?.acceptedAt, '2026-07-29T00:00:00Z');
  assert.equal(selectCurrentLegalAcceptance({ ...status, acceptances: status.acceptances.slice(0, 1) }, 'terms'), undefined);
});

test('MFA remains before consent and migration stays least privilege', () => {
  const app = read('src/App.tsx'); assert.match(app, /consentBypass = !isAuthenticated \|\| mfaRequired/);
  const sql = read('supabase/migrations/20260729130000_sprint39_legal_consent.sql');
  assert.match(sql, /enable row level security/i); assert.match(sql, /security definer set search_path = public, pg_catalog/i); assert.doesNotMatch(sql, /\b(ip_address|user_agent|access_token|session_id)\b/i);
});

test('consent translations have exact parity', async () => { const { consentPtBR, consentEnUS } = await import('../src/i18n/locales/consent.ts'); assert.deepEqual(Object.keys(consentPtBR).sort(), Object.keys(consentEnUS).sort()); });
