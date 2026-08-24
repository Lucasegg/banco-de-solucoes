import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const publishedMerge = '89c2278e5829e4f5b4b2493f909047f559ba6048';
const manifestPath = 'docs/release/1.0.0-manifest.md';
const manifest = readFileSync(manifestPath, 'utf8');

test('manifesto final identifica sem ambiguidade a revisão publicada', () => {
  assert.match(manifest, /Versão \| `1\.0\.0`/);
  assert.ok(manifest.includes(`Revisão publicada | \`${publishedMerge}\``));
  assert.match(manifest, /2026-08-24T17:38:23Z/);
  assert.match(manifest, /PR #103/);
  assert.match(manifest, /execução #365 — concluída com sucesso/);
  assert.match(manifest, /execução #366 — concluída com sucesso/);
  assert.match(manifest, /smoke somente leitura concluído com sucesso/);
  assert.match(manifest, /não declara o Production Monitor\s+verde/i);
});

test('links de evidência são HTTPS e apontam para recursos GitHub esperados', () => {
  const links = [...manifest.matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]);
  assert.ok(links.includes('https://github.com/Lucasegg/banco-de-solucoes/pull/103'));
  assert.ok(links.includes('https://github.com/Lucasegg/banco-de-solucoes/actions/runs/32741160586'));
  assert.ok(links.includes('https://github.com/Lucasegg/banco-de-solucoes/actions/runs/32741514881'));
  assert.ok(links.includes('https://www.bancodesolucoes.com.br/'));
  for (const link of links) assert.doesNotThrow(() => new URL(link));
});

test('Sprint 56 não altera migrations, secrets, dependências ou gates', () => {
  const changed = execFileSync('git', ['diff', '--name-only', publishedMerge, '--'], {
    encoding: 'utf8',
  }).trim().split('\n').filter(Boolean);

  assert.ok(changed.length > 0, 'o contrato deve inspecionar o diff da sprint');
  assert.equal(changed.some((path) => path.startsWith('supabase/migrations/')), false);
  assert.equal(changed.some((path) => path.startsWith('.github/workflows/')), false);
  assert.equal(changed.includes('package-lock.json'), false);
  assert.equal(changed.some((path) => /(^|\/)(\.env|secrets?)(\.|\/|$)/i.test(path)), false);

  const packageJsonAtRelease = execFileSync('git', ['show', `${publishedMerge}:package.json`], { encoding: 'utf8' });
  const before = JSON.parse(packageJsonAtRelease);
  const after = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.deepEqual(after.dependencies, before.dependencies);
  assert.deepEqual(after.devDependencies, before.devDependencies);
});
