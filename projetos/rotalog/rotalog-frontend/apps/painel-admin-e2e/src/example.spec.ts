import { test, expect } from '@playwright/test';

// Fase 1 (ADR 0001): substitui o exemplo do Nx, que esperava "Welcome".
test('a raiz redireciona para o dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
});

for (const rota of ['veiculos', 'motoristas', 'manutencoes', 'entregas']) {
  test(`navega para /${rota}`, async ({ page }) => {
    await page.goto(`/${rota}`);
    await expect(page).toHaveURL(new RegExp(`/${rota}$`));
  });
}
