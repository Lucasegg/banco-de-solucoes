import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const dependabot = readFileSync('.github/dependabot.yml', 'utf8');
const docs = readFileSync('docs/sprint51-security-release-hardening.md', 'utf8');
const nvmrc = readFileSync('.nvmrc', 'utf8').trim();

test('security:audit exists and does not use audit fix force', () => {
  assert.equal(pkg.scripts['security:audit'], 'node --experimental-strip-types scripts/securityAudit.ts');
  assert.equal(pkg.scripts['security:audit:report'], 'node --experimental-strip-types scripts/securityAuditReport.ts');
  assert.doesNotMatch(JSON.stringify(pkg.scripts), /npm audit fix --force/);
  assert.doesNotMatch(readFileSync('scripts/securityAudit.ts', 'utf8'), /audit fix --force/);
});

test('verify runs security gate before build', () => {
  const verify = workflow.slice(workflow.indexOf('\n  verify:'), workflow.indexOf('\n  e2e:'));
  const report = verify.indexOf('run: npm run security:audit:report');
  const audit = verify.indexOf('run: npm run security:audit\n');
  const build = verify.indexOf('npm run build');
  assert.ok(report > 0, 'full audit report must be in verify');
  assert.ok(audit > report, 'production gate must run after full report');
  assert.ok(build > audit, 'security gate must run before build');
  assert.match(verify, /npm run test:sprint51/);
});

test('Dependabot is conservative and has no automerge or grouped majors', () => {
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.match(dependabot, /target-branch: main/);
  assert.match(dependabot, /open-pull-requests-limit: [1-5]/);
  assert.doesNotMatch(dependabot, /auto-?merge|update-types:\s*\n\s*- major/i);
});

test('workflow permissions and deployment gates remain constrained', () => {
  assert.match(workflow, /^permissions:\n  contents: read\n  pages: write\n  id-token: write/m);
  assert.match(workflow, /production-smoke:[\s\S]*permissions:\n      contents: read/);
  for (const job of ['production-preflight:', 'migrate-and-health:', 'deploy:', 'production-smoke:']) assert.match(workflow, new RegExp(`^  ${job}`, 'm'));
  assert.match(workflow, /needs: \[verify, e2e\]/);
  assert.match(workflow, /db push/);
  assert.match(workflow, /test:production-smoke/);
});

test('Node is standardized through .nvmrc across Node setup steps', () => {
  assert.match(nvmrc, /^24\.\d+\.\d+$/);
  assert.equal([...workflow.matchAll(/node-version-file: \.nvmrc/g)].length, [...workflow.matchAll(/actions\/setup-node@/g)].length);
  assert.doesNotMatch(workflow, /node-version: 20|node-version: 24(?:\n|\.)/);
});

test('SBOM is generated from lockfile and uploaded only on push to main', () => {
  assert.match(pkg.scripts['sbom:generate'], /npm sbom --sbom-format cyclonedx/);
  const sbom = workflow.slice(workflow.indexOf('Generate SBOM from npm lockfile'), workflow.indexOf('Preserve build for deploy'));
  assert.match(sbom, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(sbom, /uses: actions\/upload-artifact@[a-f0-9]{40} # v7\.0\.1/);
  assert.match(sbom, /retention-days: 14/);
  assert.ok(!existsSync('sbom.cyclonedx.json'), 'generated SBOM must not be committed');
});

test('SECURITY policy and Sprint 51 documentation exist', () => {
  assert.ok(existsSync('SECURITY.md'));
  assert.match(readFileSync('SECURITY.md', 'utf8'), /Não publique vulnerabilidades como issues públicas/);
  for (const section of ['resultado real do audit', 'Dependabot', 'pinagem', 'Node', 'SBOM', 'rollback', 'checklist']) assert.match(docs.toLowerCase(), new RegExp(section.toLowerCase()));
});

test('Actions are pinned to immutable SHAs with readable version comments', () => {
  const uses = [...workflow.matchAll(/uses: ([^@\s]+)@([^\s#]+)(?:\s+#\s*([^\n]+))?/g)];
  assert.ok(uses.length > 0);
  for (const [, action, ref, comment] of uses) {
    assert.match(ref, /^[a-f0-9]{40}$/, `${action} must be pinned to a 40-character SHA`);
    assert.match(comment ?? '', /^v\d+(?:\.\d+){0,2}(?:-[\w.]+)?$/, `${action} must keep a readable version comment`);
  }
  assert.doesNotMatch(workflow, /uses: [^\n]+@v\d+(?:\s|$)/);
  assert.doesNotMatch(workflow, /ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION/);
  assert.doesNotMatch(workflow, /dorny\/paths-filter/);
  assert.ok(readdirSync('.github/workflows').includes('deploy.yml'));
});
