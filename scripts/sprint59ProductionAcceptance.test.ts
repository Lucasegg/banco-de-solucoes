import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const doc = read('docs/sprint-59-homologacao-producao.md');
const workflow = read('.github/workflows/deploy.yml');
const smoke = read('e2e/production-smoke.spec.ts');
const authReturn = read('src/components/auth/authReturnTo.ts');
const sharedLocale = read('src/i18n/locales/shared.ts');

test('documento registra estaticamente o merge obrigatório da Sprint 58', () => {
  assert.match(doc, /94a4b070a4ded88d790dd84f62f4fa5e2e53e983/);
  assert.doesNotMatch(read('package.json'), /merge-base/);
});

test('inventário registra os três papéis, experiência, integrações e limites de evidência', () => {
  for (const heading of ['Visitante anônimo', 'Membro autenticado', 'Administrador', 'Experiência e acessibilidade', 'Produção e integrações', 'Defeitos encontrados', 'Riscos residuais', 'Decisão final de homologação']) {
    assert.match(doc, new RegExp(`## ${heading}`), `seção obrigatória ausente: ${heading}`);
  }
  for (const evidence of ['npm run test:e2e', 'npm run test:production-smoke', 'não executado em produção', 'somente leitura', '94a4b070a4ded88d790dd84f62f4fa5e2e53e983']) {
    assert.match(doc, new RegExp(evidence, 'i'), `limite ou evidência ausente: ${evidence}`);
  }
});

test('smoke de produção cobre HTTPS, SEO, jornadas públicas, i18n, teclado e autorização sem escrita', () => {
  for (const contract of ['home, HTTPS', 'robots e sitemap', 'navegação pública permanece somente leitura', 'idiomas, skip link e foco', 'visitante não monta contribuição protegida']) {
    assert.match(smoke, new RegExp(contract));
  }
  assert.match(smoke, /classifyProductionRequest/);
  const [, returnToKey = ''] = authReturn.match(/const KEY = '([^']+)'/) ?? [];
  assert.equal(returnToKey, 'banco-de-solucoes.auth-return-to');
  assert.match(smoke, new RegExp(`sessionStorage\\.getItem\\('${returnToKey}'\\)`));
  assert.match(smoke, /openReadOnly\(page, '\/#\/problems\/new'\)/);
  assert.match(smoke, /expect\(returnTo\)\.toBe\('#\/problems\/new'\)/);
  assert.match(smoke, /localStorage\.getItem\(key\) === null/);
  assert.match(smoke, /sharedPtBR\['auth\.continue'\]/);
  assert.match(sharedLocale, /'auth\.continue':'Entre ou crie uma conta para continuar'/);
  assert.doesNotMatch(smoke, /banco-de-solucoes\.auth\.return-to|\/#\/novo-problema|#\/novo-problema/);
  assert.doesNotMatch(smoke, /\.fill\([^)]*(?:senha|password|mensagem)/i);
});

test('gate bloqueante acrescenta Sprint 59 sem enfraquecer contratos anteriores', () => {
  for (const command of ['test:sprint57', 'test:sprint58', 'test:sprint59', 'security:audit:report', 'security:audit', 'test:pending-migrations', 'check:bundle-budget']) {
    assert.match(workflow, new RegExp(`npm run ${command.replace(':', '\\:')}`));
  }
  const step = workflow.match(/- name: Sprint 59[^\n]*\n\s+run: npm run test:sprint59/)?.[0] ?? '';
  assert.ok(step);
  assert.doesNotMatch(step, /continue-on-error|\|\|\s*true/);
  for (const job of ['production-preflight:', 'migrate-and-health:', 'deploy:', 'production-smoke:']) assert.match(workflow, new RegExp(job));
});

test('registro confirma ausência de mudanças sensíveis e explicita impacto operacional', () => {
  for (const confirmation of ['Migrations criadas ou alteradas: **não**', 'Dependências modificadas: **não**', 'Secrets ou arquivos de ambiente modificados: **não**', 'RLS e permissões alteradas: **não**', 'Impacto no deploy']) {
    assert.ok(doc.includes(confirmation), `confirmação ausente: ${confirmation}`);
  }
});
