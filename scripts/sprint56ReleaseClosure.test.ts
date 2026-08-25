import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const publishedMerge = '89c2278e5829e4f5b4b2493f909047f559ba6048';
const manifestPath = 'docs/release/1.0.0-manifest.md';
const manifest = readFileSync(manifestPath, 'utf8');
const DEPENDENCIES = {
  vite: 'latest',
  typescript: 'latest',
  react: 'latest',
  'react-dom': 'latest',
  'lucide-react': 'latest',
  '@supabase/supabase-js': '2.110.5',
  leaflet: '1.9.4',
};
const DEV_DEPENDENCIES = {
  tailwindcss: '^3.4.17',
  postcss: '8.5.25',
  autoprefixer: 'latest',
  '@types/leaflet': '1.9.21',
  '@playwright/test': '1.62.1',
};

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
  assert.ok(links.includes('https://github.com/Lucasegg/banco-de-solucoes/actions/runs/32756823198'));
  assert.ok(links.includes('https://github.com/Lucasegg/banco-de-solucoes/actions/runs/32757792023'));
  assert.ok(links.includes('https://www.bancodesolucoes.com.br/'));
  for (const link of links) assert.doesNotThrow(() => new URL(link));
});

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function contentDigest(paths: string[]): string {
  const hash = createHash('sha256');
  for (const path of paths.sort()) hash.update(relative('.', path)).update('\0').update(readFileSync(path)).update('\0');
  return hash.digest('hex');
}

function contentDigestText(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

test('Sprint 56 preserva migrations, secrets e dependências sem depender do histórico Git', () => {
  assert.equal(contentDigest(filesUnder('supabase/migrations')), 'f7923117f5a34a6ca2bb1d2cd3d41122d193863c31fdf83a102d8b9f276c2049');
  assert.equal(contentDigest(['package-lock.json']), '813aab0afa542a4c57fac0b9831cbc918e7dcc426fc0dd807476f4a375491e3f');

  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n');
  const trackedEnvironmentFiles = tracked.filter((path) => /(^|\/)(\.env|secrets?)(\.|\/|$)/i.test(path));
  assert.deepEqual(trackedEnvironmentFiles, ['.env.e2e', '.env.example']);

  const after = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.deepEqual(after.dependencies, DEPENDENCIES);
  assert.deepEqual(after.devDependencies, DEV_DEPENDENCIES);
});

test('workflow preserva o gate bloqueante da Sprint 56 após novas sprints', () => {
  const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
  const sprint56Step = /      - name: Sprint 56 release closure contract tests\n        run: npm run test:sprint56\n/;
  const sprint57Step = /      - name: Sprint 57 first experience contract tests\n        run: npm run test:sprint57\n/;
  const sprint58Step = /      - name: Sprint 58 first contribution contract tests\n        run: npm run test:sprint58\n/;
  assert.equal((workflow.match(/npm run test:sprint56/g) ?? []).length, 1);
  assert.match(workflow, sprint56Step);
  const [sprint56Gate] = workflow.match(sprint56Step) ?? [];
  assert.doesNotMatch(sprint56Gate, /continue-on-error|\|\|\s*true/);
  assert.match(workflow, /npm run test:sprint55\n      - name: Sprint 56[\s\S]*npm run test:sprint56\n      - name: Full dependency audit report/);

  const baselineWorkflow = workflow.replace(sprint56Step, '').replace(sprint57Step, '').replace(sprint58Step, '');
  assert.equal(contentDigestText(baselineWorkflow), 'e44deace66ea1046da2378ef726431503f8f3f1035bcec53a324947e072e4e19');
  for (const contract of ['security:audit:report', 'security:audit', 'npm run build', 'Critical browser flows',
    'migrate-and-health:', 'deploy:', 'production-smoke:']) assert.ok(workflow.includes(contract));
});
