import { spawnSync } from 'node:child_process';

export const REQUIRED_BASELINE = ['20260717250000', '20260717251000'] as const;
export const SPRINT_26_MIGRATION = '20260717260000' as const;
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
  if (!state.local.has(SPRINT_26_MIGRATION)) errors.push(`Migration local da Sprint 26 ausente: ${SPRINT_26_MIGRATION}.`);
  for (const version of state.remote) if (!state.local.has(version)) errors.push(`Migration remota sem correspondente local: ${version}.`);
  for (const version of state.local) if (version < SPRINT_26_MIGRATION && !state.remote.has(version)) errors.push(`Migration anterior à Sprint 26 ainda pendente: ${version}.`);
  return [...new Set(errors)];
}

export function baselineSummary(state: MigrationState, errors: string[]): string {
  if (errors.length === 0) {
    const sprint26 = state.remote.has(SPRINT_26_MIGRATION) ? 'aplicada' : 'pendente';
    return `✓ Histórico de migrations alinhado.\nSprint 26: ${sprint26}.`;
  }
  const missing = REQUIRED_BASELINE.filter((version) => !state.remote.has(version));
  return ['✗ Histórico de migrations não está alinhado.', ...errors.map((error) => `- ${error}`), ...(missing.length ? ['', 'Migrations aplicadas manualmente que precisam ser registradas:', ...missing.map((version) => `- ${version}`)] : []), '', 'Execute o procedimento documentado de baseline antes de habilitar o deploy automático.'].join('\n');
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
