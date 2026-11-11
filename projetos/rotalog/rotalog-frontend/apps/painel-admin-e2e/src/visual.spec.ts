import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, D7: regressão visual. 5 telas × 2 temas × 3 larguras, com as APIs mockadas.
// A linha de base de 2026-11-09 é o "antes" da evolução visual; mudanças intencionais
// devem atualizar as imagens (`npm run e2e:visual:update`) e ser revisadas no PR.
//
// As imagens ficam em src/visual.spec.ts-snapshots/ com o SO no nome (win32, linux...).
// Gere as de CI no mesmo ambiente em que o CI roda, não na máquina de cada pessoa.
const telas = [
  { rota: 'dashboard', pronto: 'Últimas Entregas' },
  { rota: 'veiculos', pronto: 'ABC1D23' },
  { rota: 'motoristas', pronto: 'Ana Souza' },
  { rota: 'manutencoes', pronto: 'Troca de óleo' },
  { rota: 'entregas', pronto: 'PED-0001' },
];

const larguras = [
  { nome: 'mobile', width: 375, height: 812 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'desktop', width: 1280, height: 800 },
];

for (const tema of ['light', 'dark'] as const) {
  for (const { nome, width, height } of larguras) {
    test.describe(`${tema} · ${nome}`, () => {
      test.use({ viewport: { width, height }, colorScheme: tema, contextOptions: { reducedMotion: 'reduce' } });

      for (const { rota, pronto } of telas) {
        test(`/${rota}`, async ({ page }) => {
          // Data fixa: os alertas do dashboard (prazo de CNH, manutenção atrasada) dependem de "hoje".
          await page.clock.setFixedTime(new Date('2026-11-09T12:00:00'));
          await mockApis(page);
          await page.goto(`/${rota}`);
          await expect(page.getByText(pronto).first()).toBeVisible();
          // Gráficos e tabela do dashboard chegam por @defer: espera os esqueletos sumirem.
          await expect(page.locator('.skeleton')).toHaveCount(0);
          await page.evaluate(() => document.fonts.ready);
          await expect(page).toHaveScreenshot(`${rota}-${tema}-${nome}.png`, {
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
