import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, fase 3 (D2/D8): o skeleton é decorativo; o anúncio é uma região role="status".
const telas = [
  { rota: 'dashboard', texto: 'Carregando dados...' },
  { rota: 'veiculos', texto: 'Carregando veículos...' },
  { rota: 'motoristas', texto: 'Carregando motoristas...' },
  { rota: 'manutencoes', texto: 'Carregando manutenções...' },
  { rota: 'entregas', texto: 'Carregando entregas...' },
];

for (const tema of ['light', 'dark'] as const) {
  for (const { rota, texto } of telas) {
    test(`/${rota} em carregamento (${tema}): anuncia, esconde o desenho e passa no axe`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
      await mockApis(page, { carregando: true });
      await page.goto(`/${rota}`);

      // Uma única região de status, com o texto, que o leitor de tela lê.
      const status = page.getByRole('status').filter({ hasText: texto });
      await expect(status).toHaveCount(1);
      await expect(status).toHaveClass(/visually-hidden/);

      // O desenho em si não entra na árvore de acessibilidade.
      const desenhos = page.locator('.skeleton');
      expect(await desenhos.count()).toBeGreaterThan(0);
      for (const d of await desenhos.all()) await expect(d).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('.loading')).toHaveCount(0);

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    });
  }
}

test('o skeleton some quando os dados chegam e a tabela real aparece', async ({ page }) => {
  await mockApis(page);
  await page.goto('/veiculos');
  await expect(page.getByText('ABC1D23').first()).toBeVisible();
  await expect(page.locator('.skeleton')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /Carregando/ })).toHaveCount(0);
});

test('com prefers-reduced-motion o brilho do skeleton não anima', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockApis(page, { carregando: true });
  await page.goto('/veiculos');
  const bloco = page.locator('.skeleton-bloco').first();
  await expect(bloco).toBeVisible();
  const anim = await bloco.evaluate((el) => getComputedStyle(el, '::after').animationName);
  expect(anim).toBe('none');
});

test('sem a preferência, o brilho anima', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mockApis(page, { carregando: true });
  await page.goto('/veiculos');
  const bloco = page.locator('.skeleton-bloco').first();
  await expect(bloco).toBeVisible();
  const anim = await bloco.evaluate((el) => getComputedStyle(el, '::after').animationName);
  expect(anim).toBe('skeleton-brilho');
});
