import { spawnSync } from 'node:child_process';

export const REQUIRED_BASELINE = ['20260717250000', '20260717251000'] as const;
export const RECONCILIATION_MIGRATION = '20260717259000' as const;
export const SPRINT_26_MIGRATION = '20260717260000' as const;
export const LEGACY_VERSIONS = ['20260715130000', '20260715150000', '20260715170000', '20260716120000', '20260716150000', '20260716160000', '20260716170000', '20260717120000', '20260717160000', '20260717190000', '20260717210000', '20260717230000', '20260717240000'] as const;
export type MigrationState = { local: Set<string>; remote: Set<string> };
type CommandResult = { status: number | null; stdout: string };

export function parseMigrationList(output: string): MigrationState {
  const local = new Set<string>();
  const remote = new Set<string>();
  const clean = output.replace(/\u001b\[[0-9;]*m/g, '');
  for (const line of clean.split(/\r?\n/)) {
    const columns = line.split('|').map((value) => value.trim());
    if (/^\d{14}$/.test(columns[0] ?? '')) local.add(columns[0]);
    if (/^\d{14}$/.test(columns[1] ?? '')) remote.add(columns[1]);
  }
  return { local, remote };
}

export function validateMigrationBaseline(state: MigrationState): string[] {
  const errors: string[] = [];
  if (state.remote.size === 0) errors.push('Histórico remoto de migrations não foi encontrado.');
  for (const version of REQUIRED_BASELINE) {
    if (!state.local.has(version)) errors.push(`Migration local obrigatória ausente: ${version}.`);
    if (!state.remote.has(version)) errors.push(`Migration aplicada manualmente ainda não registrada: ${version}.`);
  }
  if (!state.local.has(RECONCILIATION_MIGRATION)) errors.push(`Migration local de reconciliação ausente: ${RECONCILIATION_MIGRATION}.`);
  // Production's documented legacy state has only map migrations recorded. Never
  // accept superficial table presence as a baseline: reconciliation must be recorded.
  const legacyScenario = REQUIRED_BASELINE.every((version) => state.remote.has(version)) && LEGACY_VERSIONS.every((version) => !state.remote.has(version));
  if (legacyScenario && !state.remote.has(RECONCILIATION_MIGRATION)) errors.push(`Cenário legado detectado: execute e registre a reconciliação ${RECONCILIATION_MIGRATION} antes do baseline manual.`);
  for (const version of state.remote) if (!state.local.has(version)) errors.push(`Migration remota sem correspondente local: ${version}.`);
  return [...new Set(errors)];
}
export function baselineSummary(state: MigrationState, errors: string[]): string {
  if (errors.length === 0) {
    const sprint26 = state.remote.has(SPRINT_26_MIGRATION) ? 'aplicada' : 'pendente';
    return `✓ Histórico de migrations alinhado.\nReconciliação: aplicada.\nSprint 26: ${sprint26}.`;
  }
  const missing = REQUIRED_BASELINE.filter((version) => !state.remote.has(version));
  return ['✗ Histórico de migrations não está alinhado.', ...errors.map((error) => `- ${error}`), ...(missing.length ? ['', 'Migrations aplicadas manualmente que precisam ser registradas:', ...missing.map((version) => `- ${version}`)] : []), '', 'Não execute --include-all nem repair automaticamente. Siga o procedimento manual de reconciliação e baseline em docs/deploy.md.'].join('\n');
}

export function runMigrationBaselineCheck(run: () => CommandResult = () => {
  const result = spawnSync('npx', ['--yes', 'supabase@2.39.2', 'migration', 'list', '--linked'], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout ?? '' };
}): number {
  const result = run();
  if (result.status !== 0) { console.error('✗ Não foi possível consultar o histórico remoto de migrations. Verifique o link do projeto e as credenciais da CLI.'); return 1; }
  const state = parseMigrationList(result.stdout);
  const errors = validateMigrationBaseline(state);
  console.log(baselineSummary(state, errors));
  return errors.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = runMigrationBaselineCheck();
