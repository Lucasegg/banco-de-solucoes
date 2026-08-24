import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('metadados, favicon e manifest da versão 1.0 formam um conjunto completo', () => {
  const html = read('index.html');
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as { icons?: Array<{ src: string; sizes: string; type: string }> };
  for (const contract of ['rel="canonical"', 'name="description"', 'property="og:title"', 'property="og:description"', 'property="og:url"', 'name="twitter:card"', 'rel="manifest"', 'rel="icon"']) {
    assert.match(html, new RegExp(contract), `metadado ausente: ${contract}`);
  }
  assert.ok(manifest.icons?.length, 'manifest precisa declarar ao menos um ícone');
  for (const icon of manifest.icons ?? []) {
    assert.ok(icon.src.startsWith('/'));
    assert.ok(existsSync(`public${icon.src}`), `asset do manifest ausente: ${icon.src}`);
    assert.ok(icon.sizes && icon.type);
  }
});

test('auditoria local cobre rotas, dois viewports, teclado e estados resilientes', () => {
  const config = read('playwright.config.ts');
  const anonymous = read('e2e/anonymous.spec.ts');
  assert.match(config, /Desktop Chrome/);
  assert.match(config, /width: 320/);
  assert.match(anonymous, /assertNoHorizontalOverflow/);
  assert.match(anonymous, /keyboard\.press\('Tab'\)/);
  for (const contract of ['início', 'busca apresenta vazio, sucesso e falha', 'documentos legais e rota inexistente', 'contato valida consentimento']) {
    assert.match(anonymous, new RegExp(contract));
  }
});

test('gates operacionais permanecem encadeados e fail-closed', () => {
  const deploy = read('.github/workflows/deploy.yml');
  const monitor = read('.github/workflows/production-monitor.yml');
  const safety = read('scripts/productionSmokeSafety.ts');
  assert.match(deploy, /production-preflight:[\s\S]*db push --dry-run/);
  assert.match(deploy, /production-smoke:[\s\S]*needs: deploy/);
  assert.match(monitor, /npm run test:production-smoke/);
  assert.match(safety, /return 'block-mutation'/);
  assert.doesNotMatch(`${monitor}\n${read('e2e/production-smoke.spec.ts')}`, /secrets\./);
});

test('registro final contém go-live, rollback, incidentes, workflows, SHA e limites de evidência', () => {
  const doc = read('docs/release/sprint-55-final-audit.md');
  for (const heading of ['Checklist de go-live', 'Checklist de rollback', 'Investigação de falhas', 'Inventário de workflows', 'SHA auditado', 'Limitações do ambiente']) {
    assert.match(doc, new RegExp(heading));
  }
  assert.match(doc, /8bda3efbbaf1af56629ec8ae39f9c88827f31d06/);
  assert.match(doc, /não equivale a executar/i);
  assert.match(doc, /não inclui migrations/i);
});
