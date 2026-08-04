import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export type AuditVulnerability = { name: string; severity: string; isDirect?: boolean; range?: string; fixAvailable?: unknown };
export type AuditReport = { auditReportVersion?: number; vulnerabilities?: Record<string, AuditVulnerability>; metadata?: { vulnerabilities?: Record<string, number> } };
export type AuditResult = { vulnerabilities: AuditVulnerability[]; blocking: AuditVulnerability[] };
const execFileAsync = promisify(execFile);
const timeout = 120_000;
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
function score(severity: string) { const index = severities.indexOf(severity); return index < 0 ? -1 : index; }
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function fixVersion(fix: unknown) { return typeof fix === 'object' && fix && 'version' in fix ? String((fix as { version: unknown }).version) : fix === true ? 'available' : 'not available'; }
export function parseAuditJson(stdout: string): AuditReport {
  try { return JSON.parse(stdout) as AuditReport; }
  catch { throw new Error('npm audit returned invalid JSON'); }
}
export function validateAuditReport(report: unknown): AuditReport {
  if (!isObject(report)) throw new Error('npm audit returned an empty or non-object report');
  if ('error' in report) throw new Error('npm audit returned an error report');
  if (!isObject(report.metadata) || !isObject(report.metadata.vulnerabilities)) throw new Error('npm audit report is missing metadata.vulnerabilities');
  const counts = report.metadata.vulnerabilities;
  for (const severity of [...severities, 'total']) {
    if (typeof counts[severity] !== 'number' || !Number.isFinite(counts[severity])) throw new Error(`npm audit report has invalid metadata.vulnerabilities.${severity}`);
  }
  if (!isObject(report.vulnerabilities)) throw new Error('npm audit report is missing vulnerabilities map');
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (!isObject(vulnerability)) throw new Error(`npm audit vulnerability ${name} is not an object`);
    if (typeof vulnerability.name !== 'string' || !vulnerability.name) throw new Error(`npm audit vulnerability ${name} has invalid name`);
    if (score(String(vulnerability.severity)) < 0) throw new Error(`npm audit vulnerability ${name} has invalid severity`);
  }
  return report as AuditReport;
}
export function evaluateAuditReport(report: AuditReport): AuditResult {
  const vulnerabilities = Object.values(report.vulnerabilities ?? {});
  const blocking = vulnerabilities.filter((v) => score(v.severity) >= score('high'));
  return { vulnerabilities, blocking };
}
function reportFromStdout(stdout?: string) { return stdout ? validateAuditReport(parseAuditJson(stdout)) : undefined; }
export async function runProductionAudit(): Promise<AuditResult> {
  try {
    const { stdout } = await execFileAsync('npm', ['audit', '--omit=dev', '--json'], { timeout, maxBuffer: 20 * 1024 * 1024 });
    return evaluateAuditReport(validateAuditReport(parseAuditJson(stdout)));
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; killed?: boolean; signal?: string; message?: string };
    const report = reportFromStdout(err.stdout);
    if (report) return evaluateAuditReport(report);
    const cause = err.killed || err.signal === 'SIGTERM' ? `timeout after ${timeout / 1000}s` : (err.stderr || err.message || 'unknown error').trim();
    throw new Error(`npm audit --omit=dev --json failed: ${cause}`);
  }
}
export function formatAuditResult(result: AuditResult): string[] {
  if (!result.vulnerabilities.length) return ['Security audit: no production vulnerabilities reported by npm audit --omit=dev.'];
  return [`Security audit: ${result.vulnerabilities.length} production vulnerability records.`, ...result.vulnerabilities.map((v) => `- ${v.name}: ${v.severity}; ${v.isDirect ? 'direct' : 'transitive'}; range ${v.range ?? 'n/a'}; fix ${fixVersion(v.fixAvailable)}`)];
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runProductionAudit();
    for (const line of formatAuditResult(result)) console.log(line);
    if (result.blocking.length) {
      console.error(`Security audit failed: ${result.blocking.length} high/critical production vulnerability records require action.`);
      process.exit(1);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
