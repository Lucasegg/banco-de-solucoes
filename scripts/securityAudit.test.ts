import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAuditReport, parseAuditJson, validateAuditReport } from './securityAudit.ts';

function report(severity?: 'moderate' | 'high' | 'critical') {
  const vulnerabilities = severity ? { postcss: { name: 'postcss', severity, isDirect: false, range: '<=8.5.22', fixAvailable: { name: 'postcss', version: '8.5.25', isSemVerMajor: false } } } : {};
  return { auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: { info: 0, low: 0, moderate: severity === 'moderate' ? 1 : 0, high: severity === 'high' ? 1 : 0, critical: severity === 'critical' ? 1 : 0, total: severity ? 1 : 0 } } };
}

test('accepts a valid report with no vulnerabilities', () => {
  const result = evaluateAuditReport(validateAuditReport(report()));
  assert.equal(result.vulnerabilities.length, 0);
  assert.equal(result.blocking.length, 0);
});

test('allows a production report with only moderate vulnerabilities', () => {
  const result = evaluateAuditReport(validateAuditReport(report('moderate')));
  assert.equal(result.vulnerabilities.length, 1);
  assert.equal(result.blocking.length, 0);
});

test('blocks high production vulnerabilities', () => {
  const result = evaluateAuditReport(validateAuditReport(report('high')));
  assert.equal(result.blocking.length, 1);
});

test('blocks critical production vulnerabilities', () => {
  const result = evaluateAuditReport(validateAuditReport(report('critical')));
  assert.equal(result.blocking.length, 1);
});

test('rejects npm audit JSON error responses', () => {
  assert.throws(() => validateAuditReport({ error: { code: 'E403' } }), /error report/);
});

test('rejects invalid JSON', () => {
  assert.throws(() => parseAuditJson('{not-json'), /invalid JSON/);
});

test('rejects timeout or registry errors without a valid report shape', () => {
  assert.throws(() => validateAuditReport({ message: 'timeout' }), /metadata\.vulnerabilities/);
  assert.throws(() => validateAuditReport({ vulnerabilities: {} }), /metadata\.vulnerabilities/);
});
