import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0001, fase 6 (D6): zero violações sérias/críticas do axe nas 5 telas e uso só por teclado.
const telas = [
  { rota: 'dashboard', pronto: 'Últimas Entregas' },
  { rota: 'veiculos', pronto: 'ABC1D23' },
  { rota: 'motoristas', pronto: 'Ana Souza' },
  { rota: 'manutencoes', pronto: 'Troca de óleo' },
  { rota: 'entregas', pronto: 'PED-0001' },
];

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

for (const tema of ['light', 'dark'] as const) {
  for (const { rota, pronto } of telas) {
    test(`axe: /${rota} sem violações sérias (${tema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
      await page.goto(`/${rota}`);
      await expect(page.getByText(pronto).first()).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
}

test('axe: formulário de veículo com erros de validação', async ({ page }) => {
  await page.goto('/veiculos');
  await page.getByRole('button', { name: '+ Novo Veículo' }).click();
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await expect(page.getByText('Campo obrigatório.').first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});

test.describe('teclado', () => {
  test('linha de veículo abre o detalhe por Enter, Esc fecha e o foco volta ao botão', async ({ page }) => {
    await page.goto('/veiculos');
    const botao = page.getByRole('button', { name: 'Ver detalhes do veículo ABC1D23' });
    await botao.focus();
    await page.keyboard.press('Enter');
    const titulo = page.getByRole('heading', { name: /ABC1D23 - Volvo FH/ });
    await expect(titulo).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(titulo).toHaveCount(0);
    await expect(botao).toBeFocused();
  });

  test('ordenação por cabeçalho: botão atualiza aria-sort', async ({ page }) => {
    await page.goto('/veiculos');
    const th = page.getByRole('columnheader', { name: /Placa/ });
    await th.getByRole('button').press('Enter');
    await expect(th).toHaveAttribute('aria-sort', 'ascending');
    await th.getByRole('button').press('Space');
    await expect(th).toHaveAttribute('aria-sort', 'descending');
  });

  test('envio vazio mostra o erro, foca o primeiro campo inválido e não usa alert()', async ({ page }) => {
    let alertou = false;
    page.on('dialog', (d) => { alertou = true; d.dismiss(); });
    await page.goto('/veiculos');
    await page.getByRole('button', { name: '+ Novo Veículo' }).click();
    await page.getByRole('button', { name: 'Cadastrar' }).click();
    const placa = page.getByLabel(/Placa/);
    await expect(placa).toBeFocused();
    await expect(placa).toHaveAttribute('aria-invalid', 'true');
    await expect(placa).toHaveAttribute('aria-describedby', /.+/);
    expect(alertou).toBe(false);
  });

  test('skip link leva o foco ao conteúdo principal', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#conteudo')).toBeFocused();
  });
});

test('API fora do ar: erro anunciado como alert, não lista vazia', async ({ page }) => {
  await page.unrouteAll();
  await mockApis(page, { apiForaDoAr: true });
  await page.goto('/veiculos');
  await expect(page.getByRole('alert')).toContainText(/servidor/i);
  await expect(page.getByText('Nenhum veículo encontrado.')).toHaveCount(0);
});
