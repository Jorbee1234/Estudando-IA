import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, fase 4: listas com volume (57 veículos, 40 entregas), paginadas, em cartões no celular
// e no modo compacto. Mesma comparação quase exata dos demais testes visuais.
const captura = (nome: string) => [
  nome,
  { fullPage: true, animations: 'disabled' as const, threshold: 0.02, maxDiffPixels: 0 },
] as const;

for (const tema of ['light', 'dark'] as const) {
  test.describe(`listas paginadas · ${tema}`, () => {
    test.use({ colorScheme: tema, contextOptions: { reducedMotion: 'reduce' } });

    test(`veículos · desktop · página 2`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await mockApis(page, { volume: 'grande' });
      await page.goto('/veiculos?pagina=2');
      await expect(page.getByText('11–20 de 57')).toBeVisible();
      await expect(page).toHaveScreenshot(...captura(`paginada-veiculos-${tema}-desktop.png`));
    });

    test(`veículos · celular · cartões`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockApis(page, { volume: 'grande' });
      await page.goto('/veiculos');
      await expect(page.getByText('1–10 de 57')).toBeVisible();
      await expect(page).toHaveScreenshot(...captura(`paginada-veiculos-${tema}-mobile.png`));
    });

    test(`entregas · desktop · filtradas`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await mockApis(page, { volume: 'grande' });
      await page.goto('/entregas?status=EM_TRANSITO&q=PED');
      await expect(page.getByText(/de 14/)).toBeVisible();
      await expect(page).toHaveScreenshot(...captura(`paginada-entregas-${tema}-desktop.png`));
    });
  });
}

test.describe('modo compacto · light', () => {
  test.use({ colorScheme: 'light', contextOptions: { reducedMotion: 'reduce' } });

  test('veículos · desktop · compacto', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockApis(page, { volume: 'grande' });
    await page.goto('/veiculos');
    await page.getByRole('button', { name: 'Modo compacto' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-densidade', 'compacta');
    await expect(page).toHaveScreenshot(...captura('paginada-veiculos-light-desktop-compacto.png'));
  });
});
