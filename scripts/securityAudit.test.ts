import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAuditProcessResult, evaluateAuditReport, parseAuditJson, validateAuditReport } from './securityAudit.ts';

function report(severity?: 'moderate' | 'high' | 'critical') {
  const vulnerabilities = severity ? { postcss: { name: 'postcss', severity, isDirect: false, range: '<=8.5.22', fixAvailable: { name: 'postcss', version: '8.5.25', isSemVerMajor: false } } } : {};
  return { auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: { info: 0, low: 0, moderate: severity === 'moderate' ? 1 : 0, high: severity === 'high' ? 1 : 0, critical: severity === 'critical' ? 1 : 0, total: severity ? 1 : 0 } } };
}
const json = (value: unknown) => JSON.stringify(value);

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
  assert.throws(() => evaluateAuditProcessResult('', { stdout: json({ error: { code: 'E403' } }) }), /error report/);
});

test('rejects invalid JSON', () => {
  assert.throws(() => parseAuditJson('{not-json'), /invalid JSON/);
  assert.throws(() => evaluateAuditProcessResult('', { stdout: '{not-json' }), /invalid JSON/);
});

test('rejects timeout killed by SIGTERM without a valid report', () => {
  assert.throws(() => evaluateAuditProcessResult('', { killed: true, signal: 'SIGTERM' }), /timeout after 120s/);
});

test('rejects registry or subprocess errors without valid stdout', () => {
  assert.throws(() => evaluateAuditProcessResult('', { stderr: '403 Forbidden - registry' }), /403 Forbidden - registry/);
  assert.throws(() => validateAuditReport({ vulnerabilities: {} }), /metadata\.vulnerabilities/);
});

test('accepts non-zero npm audit exit when stdout contains a valid vulnerability report', () => {
  const result = evaluateAuditProcessResult('', { stdout: json(report('moderate')), message: 'audit found vulnerabilities' });
  assert.equal(result.vulnerabilities.length, 1);
  assert.equal(result.blocking.length, 0);
});
