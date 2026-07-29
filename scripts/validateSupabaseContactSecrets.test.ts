import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REQUIRED_CONTACT_SECRETS, validateSupabaseContactSecrets } from './validateSupabaseContactSecrets.ts';

const complete = REQUIRED_CONTACT_SECRETS.map((name, index) => ({ name, value: `private-value-${index}`, digest: `private-digest-${index}` }));

test('accepts valid Supabase JSON when every required name exists', () => {
  assert.deepEqual(validateSupabaseContactSecrets(JSON.stringify(complete)), { ok: true, message: 'Required contact secret names are configured.' });
});

test('distinguishes a genuinely missing secret', () => {
  const result = validateSupabaseContactSecrets(JSON.stringify(complete.slice(1)));
  assert.deepEqual(result, { ok: false, kind: 'missing', message: 'Missing required Supabase secret: RESEND_API_KEY' });
});

test('distinguishes invalid JSON and an unexpected valid JSON shape', () => {
  assert.equal(validateSupabaseContactSecrets('CLI banner\nnot-json').kind, 'invalid_json');
  assert.equal(validateSupabaseContactSecrets('{"RESEND_API_KEY":true}').kind, 'unexpected_format');
});

test('CLI output never contains returned values, digests, or found names', () => {
  const run = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/checkSupabaseContactSecrets.ts'], { input: JSON.stringify(complete), encoding: 'utf8' });
  assert.equal(run.status, 0);
  const output = `${run.stdout}${run.stderr}`;
  for (const secret of complete) {
    assert.doesNotMatch(output, new RegExp(secret.value));
    assert.doesNotMatch(output, new RegExp(secret.digest));
    assert.doesNotMatch(output, new RegExp(secret.name));
  }
});

test('workflow uses modern CLI JSON for secrets without changing legacy gates', () => {
  const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
  const secretStep = workflow.slice(workflow.indexOf('- name: Validate contact secret names in Supabase'), workflow.indexOf('- name: Check migration baseline'));
  assert.match(secretStep, /supabase@2\.110\.0 secrets list --output json/);
  assert.doesNotMatch(secretStep, /supabase@2\.39\.2 secrets list/);
  assert.match(workflow, /supabase@2\.39\.2 link --project-ref/);
  assert.match(workflow, /supabase@2\.39\.2 migration list --linked/);
});
