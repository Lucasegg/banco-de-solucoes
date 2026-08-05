import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const dependabot = readFileSync('.github/dependabot.yml', 'utf8');
const docs = readFileSync('docs/sprint52-dependency-governance.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

test('Dependabot keeps majors out of groups and blocks Tailwind 4 in this sprint', () => {
  const groups = [...dependabot.matchAll(/groups:\n([\s\S]*?)(?:\n    ignore:|\n  - package-ecosystem:|\n?$)/g)].map((m) => m[1]).join('\n');
  assert.match(groups, /update-types:\n\s+- patch/);
  assert.match(groups, /update-types:\n\s+- minor/);
  assert.doesNotMatch(groups, /- major|version-update:semver-major/);
  assert.match(dependabot, /dependency-name: tailwindcss[\s\S]*version-update:semver-major/);
});

test('Dependabot has no automerge and uses conservative separate npm and Actions limits', () => {
  assert.doesNotMatch(dependabot, /auto-?merge|merge-method|rebase-strategy:\s*auto/i);
  assert.match(dependabot, /package-ecosystem: npm[\s\S]*open-pull-requests-limit: 2/);
  assert.match(dependabot, /package-ecosystem: github-actions[\s\S]*open-pull-requests-limit: 1/);
  assert.match(dependabot, /package-ecosystem: npm[\s\S]*target-branch: main/);
  assert.match(dependabot, /package-ecosystem: github-actions[\s\S]*target-branch: main/);
});

test('GitHub Actions majors are not accepted automatically or grouped', () => {
  const actionsBlock = dependabot.slice(dependabot.indexOf('package-ecosystem: github-actions'));
  assert.match(actionsBlock, /ignore:[\s\S]*dependency-name: '\*'[\s\S]*version-update:semver-major/);
  assert.doesNotMatch(actionsBlock.slice(actionsBlock.indexOf('groups:'), actionsBlock.indexOf('ignore:')), /major|version-update:semver-major/);
});

test('workflow concurrency isolates PRs while preserving serialized main deploys', () => {
  assert.match(workflow, /group: \$\{\{ github\.event_name == 'pull_request' && format\('ci-pr-\{0\}', github\.event\.pull_request\.number\)/);
  assert.match(workflow, /github\.event_name == 'push' && 'deploy-main'/);
  assert.match(workflow, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.doesNotMatch(workflow, /group: pages-\$\{\{ github\.event_name \}\}/);
  assert.match(workflow, /migrate-and-health:[\s\S]*if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'[\s\S]*deploy:[\s\S]*needs: migrate-and-health[\s\S]*production-smoke:[\s\S]*needs: deploy/);
});

test('Actions remain pinned to immutable SHAs and Sprint 52 is in CI', () => {
  const uses = [...workflow.matchAll(/uses: ([^@\s]+)@([^\s#]+)(?:\s+#\s*([^\n]+))?/g)];
  assert.ok(uses.length > 0);
  for (const [, action, ref, comment] of uses) {
    assert.match(ref, /^[a-f0-9]{40}$/, `${action} must be pinned to an immutable SHA`);
    assert.match(comment ?? '', /^v\d+(?:\.\d+){0,2}(?:-[\w.]+)?$/, `${action} needs a readable version comment`);
  }
  assert.equal(pkg.scripts['test:sprint52'], 'node --experimental-strip-types --test scripts/sprint52DependencyGovernance.test.ts');
  assert.match(workflow, /npm run test:sprint52/);
});

test('operational documentation records Dependabot PR decisions and review protocol', () => {
  for (const pr of ['#87', '#88', '#89', '#90', '#92', '#93']) assert.match(docs, new RegExp(pr));
  for (const phrase of ['patch segura', 'minor compatível', 'major incompatível', 'mudança de runtime', 'Production Preflight']) assert.match(docs, new RegExp(phrase, 'i'));
  assert.match(docs, /não fazer merge automático/i);
});
