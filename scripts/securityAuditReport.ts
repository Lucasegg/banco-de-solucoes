import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { evaluateAuditReport, parseAuditJson, validateAuditReport, type AuditProcessFailure } from './securityAudit.ts';

const execFileAsync = promisify(execFile);
const timeout = 120_000;

function failureMessage(error: AuditProcessFailure) {
  const cause = error.killed || error.signal === 'SIGTERM' ? `timeout after ${timeout / 1000}s` : (error.stderr || error.message || 'unknown error').trim();
  return `npm audit --json failed: ${cause}`;
}
function reportFromStdout(stdout?: string) {
  if (!stdout) throw new Error('npm audit --json failed: missing JSON report');
  return validateAuditReport(parseAuditJson(stdout));
}
async function runFullAuditReport() {
  try {
    const { stdout } = await execFileAsync('npm', ['audit', '--json'], { timeout, maxBuffer: 20 * 1024 * 1024 });
    return reportFromStdout(stdout);
  } catch (error) {
    const err = error as AuditProcessFailure;
    if (err.stdout) return reportFromStdout(err.stdout);
    throw new Error(failureMessage(err));
  }
}
function printableFix(fix: unknown) {
  if (typeof fix === 'object' && fix && 'version' in fix) return `${String((fix as { name?: unknown; version: unknown; isSemVerMajor?: unknown }).name ?? 'package')}@${String((fix as { version: unknown }).version)}${(fix as { isSemVerMajor?: unknown }).isSemVerMajor ? ' (major)' : ''}`;
  return fix === true ? 'available' : 'not available';
}
try {
  const report = await runFullAuditReport();
  const result = evaluateAuditReport(report);
  const counts = report.metadata?.vulnerabilities;
  console.log(`Full npm audit report: total=${counts?.total ?? 0}; info=${counts?.info ?? 0}; low=${counts?.low ?? 0}; moderate=${counts?.moderate ?? 0}; high=${counts?.high ?? 0}; critical=${counts?.critical ?? 0}`);
  if (!result.vulnerabilities.length) console.log('No vulnerabilities reported in the complete npm dependency graph.');
  for (const vulnerability of result.vulnerabilities) {
    console.log(`- ${vulnerability.name}: severity=${vulnerability.severity}; ${vulnerability.isDirect ? 'direct' : 'transitive'}; range=${vulnerability.range ?? 'n/a'}; fix=${printableFix(vulnerability.fixAvailable)}`);
  }
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
