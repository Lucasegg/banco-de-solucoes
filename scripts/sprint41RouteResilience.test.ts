import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createServer } from 'vite';

const boundary = readFileSync('src/components/RouteErrorBoundary.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const translations = readFileSync('src/i18n/locales/common.ts', 'utf8');

test('recognizes browser, bundler and Vite chunk failures without treating unknown errors as chunks', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { classifyRouteError } = await vite.ssrLoadModule('/src/components/RouteErrorBoundary.tsx');
    assert.equal(classifyRouteError(Object.assign(new Error('network'), { name: 'ChunkLoadError' })), 'chunk-load');
    assert.equal(classifyRouteError(new TypeError('Failed to fetch dynamically imported module: /assets/private.js')), 'chunk-load');
    assert.equal(classifyRouteError({ type: 'vite:preloadError' }), 'chunk-load');
    assert.equal(classifyRouteError(new Error('token=secret Supabase render failure')), 'render');
  } finally { await vite.close(); }
});

test('renders a safe, translated and accessible recovery experience', () => {
  for (const text of ['Não foi possível abrir esta página', 'Tentar novamente', 'Voltar ao início', 'We could not open this page', 'Try again', 'Return home']) assert.ok(translations.includes(text));
  assert.match(boundary, /role="alert"/); assert.match(boundary, /aria-labelledby="route-error-title"/);
  assert.match(boundary, /tabIndex=\{-1\}/); assert.match(boundary, /heading\.current\?\.focus\(\)/);
  assert.match(boundary, /type="button" onClick=\{onRetry\}/); assert.match(boundary, /type="button" onClick=\{onHome\}/);
  for (const secret of ['technical_message', 'componentStack', 'access_token', 'refresh_token', 'supabase']) assert.doesNotMatch(boundary.toLowerCase(), new RegExp(`${secret}.*this\\.state\\.error`));
});

test('manual retry preserves the requested hash and cannot create an automatic reload loop', () => {
  assert.match(boundary, /private retry[\s\S]*window\.location\.reload\(\)/);
  assert.doesNotMatch(boundary, /sessionStorage|localStorage|setInterval|setTimeout/);
  assert.equal((boundary.match(/window\.location\.reload\(\)/g) || []).length, 1);
  assert.match(app, /onHome=\{\(\) => setPage\('home'\)\}/);
});

test('boundary protects only route content and remains inside fail-closed legal and security gates', () => {
  assert.match(app, /<Layout[\s\S]*<LegalConsentGate[\s\S]*<RouteErrorBoundary[\s\S]*<Suspense/);
  assert.match(app, /<Suspense[\s\S]*<AuthenticatedRoute[\s\S]*<(?:ProblemForm|Profile|Account)/);
  assert.match(app, /<Suspense[\s\S]*<AdminRoute[\s\S]*TaxonomyProposalQueue/);
  assert.match(app, /mfaRequired && page !== 'mfa-challenge'[\s\S]*setPage\('mfa-challenge'\)/);
  assert.match(boundary, /logger\.warn\([\s\S]*category:[\s\S]*route:[\s\S]*build:/);
  assert.doesNotMatch(boundary, /logger\.error\([^)]*error/);
});
