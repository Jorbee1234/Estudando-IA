import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0001, fase 7 (D5a): CSP sem quebrar a app, e alert()/confirm() trocados por componentes acessíveis.
test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test('a CSP não bloqueia nada nas 5 telas', async ({ page }) => {
  const violacoes: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|violates the following/i.test(m.text())) violacoes.push(m.text());
  });
  page.on('pageerror', (e) => violacoes.push(e.message));
  for (const rota of ['dashboard', 'veiculos', 'motoristas', 'manutencoes', 'entregas']) {
    await page.goto(`/${rota}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  expect(violacoes).toEqual([]);
});

test('"Nova Manutenção" avisa por toast em vez de alert()', async ({ page }) => {
  let alertou = false;
  page.on('dialog', (d) => { alertou = true; d.dismiss(); });
  await page.goto('/manutencoes');
  await page.getByRole('button', { name: '+ Nova Manutenção' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'não implementada' })).toBeVisible();
  expect(alertou).toBe(false);
});

test.describe('confirmação de desativação', () => {
  test('abre o diálogo com foco dentro, Esc cancela e o foco volta ao botão', async ({ page }) => {
    let alterou = false;
    page.on('request', (r) => { if (r.method() === 'PATCH') alterou = true; });
    await page.goto('/veiculos');
    const desativar = page.getByRole('row', { name: /ABC1D23/ }).getByRole('button', { name: 'Desativar' });
    await desativar.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: 'Desativar veículo' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('ABC1D23');
    // O fundo fica inerte: o foco só passa pelo diálogo (ou sai para a interface do navegador), nunca pela página.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog'))).toBe(true);
    }
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialogo).toHaveCount(0);
    await expect(desativar).toBeFocused();
    expect(alterou).toBe(false);
  });

  test('confirmar chama PATCH desativar, avisa e a linha passa a Inativo', async ({ page }) => {
    const patches: string[] = [];
    page.on('request', (r) => { if (r.method() === 'PATCH') patches.push(new URL(r.url()).pathname); });
    await page.goto('/veiculos');
    const linha = page.getByRole('row', { name: /ABC1D23/ });
    await linha.getByRole('button', { name: 'Desativar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Desativar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'ABC1D23 desativado' })).toBeVisible();
    expect(patches).toEqual(['/api/veiculos/1/desativar']);
    await expect(linha).toContainText('Inativo');
    // Inativo: a ação passa a ser Reativar (a API tem o PATCH), não mais um botão desabilitado.
    await expect(linha.getByRole('button', { name: 'Desativar' })).toHaveCount(0);
    await expect(linha.getByRole('button', { name: 'Reativar' })).toBeVisible();
  });
});
