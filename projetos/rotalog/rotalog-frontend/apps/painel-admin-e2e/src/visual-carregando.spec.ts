import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, fase 3: estados de carregamento (APIs que nunca respondem). A linha de base é o
// "antes" (texto "Carregando…"); com o skeleton ela é atualizada de propósito e revisada no PR.
const telas = [
  { rota: 'dashboard', pronto: /Carregando dados/ },
  { rota: 'veiculos', pronto: /Carregando veículos/ },
  { rota: 'motoristas', pronto: /Carregando motoristas/ },
  { rota: 'manutencoes', pronto: /Carregando manutenções/ },
  { rota: 'entregas', pronto: /Carregando entregas/ },
];

const larguras = [
  { nome: 'mobile', width: 375, height: 812 },
  { nome: 'desktop', width: 1280, height: 800 },
];

for (const tema of ['light', 'dark'] as const) {
  for (const { nome, width, height } of larguras) {
    test.describe(`carregando · ${tema} · ${nome}`, () => {
      test.use({ viewport: { width, height }, colorScheme: tema, contextOptions: { reducedMotion: 'reduce' } });

      for (const { rota, pronto } of telas) {
        test(`/${rota}`, async ({ page }) => {
          await mockApis(page, { carregando: true });
          await page.goto(`/${rota}`);
          await expect(page.getByRole('status').filter({ hasText: pronto })).toBeAttached();
          await page.evaluate(() => document.fonts.ready);
          await expect(page).toHaveScreenshot(`carregando-${rota}-${tema}-${nome}.png`, {
            fullPage: true,
            animations: 'disabled',
            // Quase exata: 0,02 tolera o antialiasing de 1/255 nos cantos, mas pega trocas sutis de cor
            // (com o padrão 0,2 e 1% de pixels, caixa branca virar cartão branco com barras passava).
            threshold: 0.02,
            maxDiffPixels: 0,
          });
        });
      }
    });
  }
}
