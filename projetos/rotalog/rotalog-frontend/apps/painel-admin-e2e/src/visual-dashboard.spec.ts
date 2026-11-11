import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, fase 5: dashboard com volume (57 veículos, 25 manutenções atrasadas): alertas limitados a 6
// ("e mais N"), rosca e barras. Relógio fixo para os prazos serem estáveis.
const captura = (nome: string) => [
  nome,
  { fullPage: true, animations: 'disabled' as const, threshold: 0.02, maxDiffPixels: 0 },
] as const;

for (const tema of ['light', 'dark'] as const) {
  for (const { nome, width, height } of [
    { nome: 'desktop', width: 1280, height: 800 },
    { nome: 'tablet', width: 768, height: 1024 },
    { nome: 'mobile', width: 375, height: 812 },
  ]) {
    test(`dashboard cheio · ${tema} · ${nome}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme: tema, reducedMotion: 'reduce' });
      await page.clock.setFixedTime(new Date('2026-11-09T12:00:00'));
      await mockApis(page, { volume: 'grande' });
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Últimas Entregas' })).toBeVisible();
      await expect(page.locator('.skeleton')).toHaveCount(0);
      await expect(page.locator('app-donut-chart')).toBeAttached();
      await expect(page).toHaveScreenshot(...captura(`dashboard-cheio-${tema}-${nome}.png`));
    });
  }
}
