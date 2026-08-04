import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

type AuditVulnerability = { name: string; severity: string; isDirect?: boolean; via?: unknown[]; effects?: string[]; range?: string; fixAvailable?: unknown };
type AuditReport = { vulnerabilities?: Record<string, AuditVulnerability>; metadata?: { vulnerabilities?: Record<string, number> } };
const execFileAsync = promisify(execFile);
const timeout = 120_000;
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
function score(severity: string) { return severities.indexOf(severity); }
function fixVersion(fix: unknown) { return typeof fix === 'object' && fix && 'version' in fix ? String((fix as { version: unknown }).version) : fix === true ? 'available' : 'not available'; }
async function auditProd(): Promise<AuditReport> {
  try {
    const { stdout } = await execFileAsync('npm', ['audit', '--omit=dev', '--json'], { timeout, maxBuffer: 20 * 1024 * 1024 });
    return JSON.parse(stdout || '{}') as AuditReport;
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number; killed?: boolean; signal?: string; message?: string };
    if (err.stdout) {
      try { return JSON.parse(err.stdout) as AuditReport; } catch { /* fall through */ }
    }
    const cause = err.killed || err.signal === 'SIGTERM' ? `timeout after ${timeout / 1000}s` : (err.stderr || err.message || 'unknown error').trim();
    throw new Error(`npm audit --omit=dev --json failed: ${cause}`);
  }
}
const report = await auditProd();
const vulnerabilities = Object.values(report.vulnerabilities ?? {});
const blocking = vulnerabilities.filter((v) => score(v.severity) >= score('high'));
if (!vulnerabilities.length) console.log('Security audit: no production vulnerabilities reported by npm audit --omit=dev.');
else {
  console.log(`Security audit: ${vulnerabilities.length} production vulnerability records.`);
  for (const v of vulnerabilities) console.log(`- ${v.name}: ${v.severity}; ${v.isDirect ? 'direct' : 'transitive'}; range ${v.range ?? 'n/a'}; fix ${fixVersion(v.fixAvailable)}`);
}
if (blocking.length) {
  console.error(`Security audit failed: ${blocking.length} high/critical production vulnerability records require action.`);
  process.exit(1);
}
