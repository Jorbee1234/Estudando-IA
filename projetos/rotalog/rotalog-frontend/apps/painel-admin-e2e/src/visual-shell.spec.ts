import { expect, Page, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, fase 6: menu recolhido (com e sem dica), gaveta aberta no celular e modo compacto do menu.
const captura = (nome: string) => [
  nome,
  { fullPage: true, animations: 'disabled' as const, threshold: 0.02, maxDiffPixels: 0 },
] as const;

const preparar = async (page: Page, tema: 'light' | 'dark') => {
  await page.emulateMedia({ colorScheme: tema, reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-11-09T12:00:00'));
  await mockApis(page);
};

for (const tema of ['light', 'dark'] as const) {
  test.describe(`menu · ${tema}`, () => {
    test(`dashboard · desktop · recolhido`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await preparar(page, tema);
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Últimas Entregas' })).toBeVisible();
      await expect(page.locator('.skeleton')).toHaveCount(0);
      await page.getByRole('button', { name: 'Recolher menu' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'recolhida');
      await expect(page).toHaveScreenshot(...captura(`menu-recolhido-dashboard-${tema}-desktop.png`));
    });

    test(`veículos · desktop · recolhido, com a dica de um item`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await preparar(page, tema);
      await page.goto('/veiculos');
      await expect(page.getByText('ABC1D23').first()).toBeVisible();
      await page.getByRole('button', { name: 'Recolher menu' }).click();
      const nav = page.getByRole('navigation', { name: 'Navegação principal' });
      // Foco por teclado (e não só o mouse) é o que mostra a dica e o contorno de foco.
      await nav.getByRole('link', { name: 'Motoristas' }).focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect.poll(() => nav.getByRole('link', { name: 'Motoristas' }).evaluate((el) => getComputedStyle(el, '::after').opacity)).toBe('1');
      await expect(page).toHaveScreenshot(...captura(`menu-recolhido-dica-${tema}-desktop.png`));
    });

    test(`veículos · celular · gaveta aberta`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await preparar(page, tema);
      await page.goto('/veiculos');
      await expect(page.getByText('ABC1D23').first()).toBeVisible();
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Entregas' })).toBeVisible();
      await expect(page).toHaveScreenshot(...captura(`menu-gaveta-${tema}-mobile.png`));
    });
  });
}
