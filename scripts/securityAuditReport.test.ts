import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync('scripts/securityAuditReport.ts', 'utf8');

test('full audit report validates npm audit JSON without suppressing operational failures', () => {
  assert.match(script, /npm', \['audit', '--json'\]/);
  assert.match(script, /validateAuditReport\(parseAuditJson/);
  assert.doesNotMatch(script, /\|\| true|continue-on-error/);
  assert.match(script, /Full npm audit report:/);
});
