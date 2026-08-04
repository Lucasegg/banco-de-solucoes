import { readFile, readdir, stat } from 'node:fs/promises';
type Budget = { asset: string; maxBytes: number };
const config = JSON.parse(await readFile(new URL('../config/bundle-budget.json', import.meta.url), 'utf8')) as { budgets: Budget[] };
const assetsDir = new URL('../dist/assets/', import.meta.url); const files = await readdir(assetsDir); let failed = false;
for (const budget of config.budgets) {
  const matcher = new RegExp(`^${budget.asset.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('*', '.*')}$`);
  const matches = files.filter(file => matcher.test(file));
  if (matches.length !== 1) throw new Error(`Orçamento esperava exatamente um asset ${budget.asset}; encontrados: ${matches.join(', ') || 'nenhum'}`);
  const bytes = (await stat(new URL(matches[0], assetsDir))).size;
  console.log(`${matches[0]}: ${bytes} / ${budget.maxBytes} bytes`);
  if (bytes > budget.maxBytes) { console.error(`BUNDLE BUDGET EXCEDIDO: ${matches[0]} excedeu por ${bytes - budget.maxBytes} bytes`); failed = true; }
}
if (failed) process.exitCode = 1;
