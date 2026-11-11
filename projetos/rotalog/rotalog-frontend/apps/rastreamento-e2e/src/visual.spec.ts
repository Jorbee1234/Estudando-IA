import AxeBuilder from '@axe-core/playwright';
import { buscar, expect, LARGURAS, mockPedido, pedido, test } from './fixtures';

/** Linha de base visual + axe por estado e largura (ADR 0004, D10). */
for (const { nome, width, height } of LARGURAS) {
  test.describe(`largura ${nome}`, () => {
    test.use({ viewport: { width, height } });

    test('inicial', async ({ api: page }) => {
      await page.goto('/');
      await expect(page.getByLabel('Número do pedido')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`inicial-${nome}.png`);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('carregando', async ({ api: page }) => {
      await page.route('http://localhost:3000/api/rastreamento/pedido/LENTO', () => new Promise(() => undefined));
      await page.goto('/');
      await buscar(page, 'LENTO');
      await expect(page.getByText('Buscando pedido...')).toBeVisible();
      await expect(page).toHaveScreenshot(`carregando-${nome}.png`);
    });

    test('resultado em trânsito', async ({ api: page }) => {
      await mockPedido(page, 'PED-001', pedido());
      await page.goto('/');
      await buscar(page, 'PED-001');
      await expect(page.getByRole('heading', { name: 'Pedido PED-001' })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`resultado-${nome}.png`, { mask: [page.locator('[data-teste="atualizado"]')] });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('não encontrado', async ({ api: page }) => {
      await mockPedido(page, 'NADA', { error: 'Pedido não encontrado' }, 404);
      await page.goto('/');
      await buscar(page, 'NADA');
      await expect(page.getByText(/Pedido NADA não encontrado/)).toBeVisible();
      await expect(page).toHaveScreenshot(`nao-encontrado-${nome}.png`);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('erro', async ({ api: page }) => {
      await mockPedido(page, 'ERRO', { error: 'Muitas consultas. Tente novamente em instantes.' }, 429);
      await page.goto('/');
      await buscar(page, 'ERRO');
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page).toHaveScreenshot(`erro-${nome}.png`);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  });
}
