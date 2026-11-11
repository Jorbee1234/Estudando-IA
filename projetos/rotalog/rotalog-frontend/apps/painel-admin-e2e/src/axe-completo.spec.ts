import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, item 8 (fechamento, D8): cobre com axe os estados que os outros specs não alcançam.
// Critério: zero violações sérias ou críticas em WCAG 2.0/2.1/2.2 A e AA, nos dois temas.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function semViolacoesGraves(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const graves = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(graves).toEqual([]);
}

const telas = ['dashboard', 'veiculos', 'motoristas', 'manutencoes', 'entregas'] as const;

for (const tema of ['light', 'dark'] as const) {
  test.describe(`axe completo · ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
      await page.clock.setFixedTime(new Date('2026-11-09T12:00:00'));
    });

    test('página 404', async ({ page }) => {
      await mockApis(page);
      await page.goto('/rota-que-nao-existe');
      await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    for (const rota of telas) {
      test(`/${rota} com a API fora do ar (banner de erro)`, async ({ page }) => {
        await mockApis(page, { apiForaDoAr: true });
        await page.goto(`/${rota}`);
        await expect(page.getByRole('alert')).toBeVisible();
        await semViolacoesGraves(page);
      });

      test(`/${rota} sem dados (estado vazio)`, async ({ page }) => {
        await mockApis(page, { dados: { veiculos: [], motoristas: [], manutencoes: [], entregas: [] } });
        await page.goto(`/${rota}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.locator('.skeleton')).toHaveCount(0);
        await semViolacoesGraves(page);
      });

      test(`/${rota} em tablet (768 px)`, async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await mockApis(page, { volume: 'grande' });
        await page.goto(`/${rota}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.locator('.skeleton')).toHaveCount(0);
        await semViolacoesGraves(page);
      });
    }

    test('formulário de motorista, vazio e com erros', async ({ page }) => {
      await mockApis(page);
      await page.goto('/motoristas');
      await page.getByRole('button', { name: '+ Novo Motorista' }).click();
      await semViolacoesGraves(page);
      await page.getByRole('button', { name: 'Cadastrar' }).click();
      await expect(page.getByText('Campo obrigatório.').first()).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('formulário de veículo em edição', async ({ page }) => {
      await mockApis(page);
      await page.goto('/veiculos');
      await page.getByRole('row', { name: /ABC1D23/ }).getByRole('button', { name: 'Editar' }).click();
      await expect(page.getByRole('heading', { name: 'Editar Veículo' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('painéis de detalhe (veículo e entrega) abertos por link', async ({ page }) => {
      await mockApis(page);
      await page.goto('/veiculos?id=1');
      await expect(page.getByRole('heading', { name: /ABC1D23/ })).toBeVisible();
      await semViolacoesGraves(page);
      await page.goto('/entregas?id=1');
      await expect(page.getByRole('heading', { name: /Entrega PED-0001/ })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('diálogo de confirmação aberto', async ({ page }) => {
      await mockApis(page);
      await page.goto('/veiculos');
      await page.getByRole('row', { name: /ABC1D23/ }).getByRole('button', { name: 'Desativar' }).click();
      await expect(page.getByRole('dialog', { name: 'Desativar veículo' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('toast visível', async ({ page }) => {
      await mockApis(page);
      await page.goto('/manutencoes');
      await page.getByRole('button', { name: '+ Nova Manutenção' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'não implementada' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('gaveta do menu aberta no celular', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockApis(page);
      await page.goto('/dashboard');
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Entregas' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('sidebar recolhida com a dica visível', async ({ page }) => {
      await mockApis(page);
      await page.goto('/veiculos');
      await page.getByRole('button', { name: 'Recolher menu' }).click();
      const nav = page.getByRole('navigation', { name: 'Navegação principal' });
      await nav.getByRole('link', { name: 'Entregas' }).focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await semViolacoesGraves(page);
    });
  });
}

// Reflow (WCAG 1.4.10): a 320 px de largura nada pode exigir rolagem horizontal da página.
test.describe('reflow a 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const rota of telas) {
    test(`/${rota} sem rolagem horizontal e sem violações`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-11-09T12:00:00'));
      await mockApis(page, { volume: 'grande' });
      await page.goto(`/${rota}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('.skeleton')).toHaveCount(0);
      const { largura, janela } = await page.evaluate(() => ({
        largura: document.documentElement.scrollWidth,
        janela: document.documentElement.clientWidth,
      }));
      expect(largura).toBeLessThanOrEqual(janela);
      await semViolacoesGraves(page);
    });
  }
});

// Zoom de texto: com a fonte 200% maior (WCAG 1.4.4) o conteúdo continua legível e sem sobreposição horizontal.
test('texto a 200%: sem rolagem horizontal no dashboard e nas listas (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockApis(page, { volume: 'grande' });
  await page.addInitScript(() => {
    document.documentElement.style.fontSize = '200%';
  });
  for (const rota of ['dashboard', 'veiculos', 'entregas']) {
    await page.goto(`/${rota}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.skeleton')).toHaveCount(0);
    const { largura, janela } = await page.evaluate(() => ({
      largura: document.documentElement.scrollWidth,
      janela: document.documentElement.clientWidth,
    }));
    expect(largura, `/${rota} a 200%`).toBeLessThanOrEqual(janela + 1);
  }
});
