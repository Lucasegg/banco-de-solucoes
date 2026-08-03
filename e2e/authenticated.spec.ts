import { expect, test, mockApi } from './fixtures';

async function authenticated(page: import('@playwright/test').Page, options: { role?: 'member' | 'admin'; consentPending?: boolean; mfaRequired?: boolean } = {}) {
  await page.addInitScript((value) => {
    localStorage.setItem('e2e.authenticated', 'true');
    localStorage.setItem('e2e.role', value.role ?? 'member');
    localStorage.setItem('e2e.consentPending', String(Boolean(value.consentPending)));
    localStorage.setItem('e2e.mfaRequired', String(Boolean(value.mfaRequired)));
  }, options);
}

test('consentimento vigente bloqueia até confirmação explícita', async ({ page, consoleErrors }) => {
  await authenticated(page, { consentPending: true }); await mockApi(page, 'empty', 'not_found');
  await page.goto('/#/profile');
  await expect(page.getByRole('heading', { name: 'Revise e aceite os documentos legais' })).toBeVisible();
  const accept = page.getByRole('button', { name: 'Aceitar e continuar' });
  await expect(accept).toBeDisabled();
  await page.getByLabel(/Li e aceito/).check(); await accept.click();
  await expect(page.getByRole('heading', { name: 'Ana Silva' })).toBeVisible();
});

test('MFA obrigatório aceita fixture determinística antes da rota protegida', async ({ page, consoleErrors }) => {
  await authenticated(page, { mfaRequired: true }); await mockApi(page);
  await page.goto('/#/profile');
  await expect(page.getByRole('heading', { name: 'Confirme sua identidade' })).toBeVisible();
  await page.getByLabel(/Código/).fill('123456');
  await page.getByRole('button', { name: 'Confirmar código' }).click();
  await expect(page.getByRole('heading', { name: 'Ana Silva' })).toBeVisible();
});

test('membro edita perfil, alterna privacidade, vê perfil próprio privado e sai', async ({ page, consoleErrors }) => {
  await authenticated(page); await mockApi(page, 'empty', 'not_found');
  await page.goto('/#/profile');
  await page.getByLabel(/Nome de exibição/).fill('Ana Atualizada');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.getByText('Perfil atualizado com sucesso.')).toBeVisible();
  const visibility = page.getByLabel('Perfil público');
  await expect(visibility).not.toBeChecked(); await visibility.check(); await expect(visibility).toBeChecked(); await visibility.uncheck();
  await page.getByRole('button', { name: 'Ver perfil público' }).click();
  await expect(page.getByRole('heading', { name: 'Este perfil não existe ou não está disponível publicamente.' })).toBeVisible();
  await page.goto('/#/profile'); await page.getByRole('button', { name: 'Sair' }).first().click();
  await expect(page).toHaveURL(/#\/login/);
});

test('membro recebe 403 e administrador abre dashboard', async ({ page, consoleErrors }) => {
  await authenticated(page); await mockApi(page); await page.goto('/#/admin');
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('e2e.role', 'admin')); await page.reload();
  await expect(page.getByRole('heading', { name: 'Painel administrativo' })).toBeVisible();
});
