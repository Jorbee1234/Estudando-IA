import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, fase 5 (D4): alertas calculados, gráficos com tabela alternativa, atalho ao rastreamento.
// O relógio é fixado em 09/11/2026 para os prazos de CNH e de manutenção serem determinísticos.
const HOJE = new Date('2026-11-09T12:00:00');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(HOJE);
});

/** Espera os blocos @defer (gráficos e tabela) trocarem os esqueletos pelo conteúdo. */
async function carregado(page: Page) {
  await expect(page.getByRole('heading', { name: 'Últimas Entregas' })).toBeVisible();
  await expect(page.locator('.skeleton')).toHaveCount(0);
}

const alertas = (page: Page) => page.locator('.alert-item');

test.describe('alertas calculados', () => {
  test('CNH vencida é crítica; a vencer em até 30 dias é atenção; em 31 dias não aparece', async ({ page }) => {
    await mockApis(page, {
      dados: {
        manutencoes: [],
        veiculos: [{ id: 1, placa: 'AAA0001', modelo: 'X', anoFabricacao: 2020, quilometragem: 1, status: 'ATIVO' }],
        motoristas: [
          { id: 1, nome: 'Vencida', cnh: '1', categoriaCnh: 'C', vencimentoCnh: '2026-11-08', status: 'ATIVO' },
          { id: 2, nome: 'Hoje', cnh: '2', categoriaCnh: 'C', vencimentoCnh: '2026-11-09', status: 'ATIVO' },
          { id: 3, nome: 'Amanha', cnh: '3', categoriaCnh: 'C', vencimentoCnh: '2026-11-10', status: 'FERIAS' },
          { id: 4, nome: 'Limite', cnh: '4', categoriaCnh: 'C', vencimentoCnh: '2026-12-09', status: 'ATIVO' },
          { id: 5, nome: 'Fora', cnh: '5', categoriaCnh: 'C', vencimentoCnh: '2026-12-10', status: 'ATIVO' },
          { id: 6, nome: 'Inativo', cnh: '6', categoriaCnh: 'C', vencimentoCnh: '2020-01-01', status: 'INATIVO' },
        ],
      },
    });
    await page.goto('/dashboard');
    await carregado(page);
    const itens = await alertas(page).allInnerTexts();
    const texto = itens.map((t) => t.replace(/\s+/g, ' '));
    expect(texto).toEqual([
      expect.stringContaining('Crítico: CNH de Vencida venceu em 08/11/2026'),
      expect.stringContaining('Atenção: CNH de Hoje vence hoje'),
      expect.stringContaining('Atenção: CNH de Amanha vence amanhã'),
      expect.stringContaining('Atenção: CNH de Limite vence em 30 dias'),
    ]);
    await expect(page.getByText('CNH de Fora')).toHaveCount(0);
    await expect(page.getByText('CNH de Inativo')).toHaveCount(0);
  });

  test('manutenção pendente atrasada usa a placa do veículo e leva à tela de manutenções', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    const alerta = alertas(page).filter({ hasText: 'atrasada' });
    await expect(alerta).toContainText('XYZ9K88');
    await expect(alerta).toContainText('20/03/2026');
    await alerta.getByRole('link').click();
    await expect(page).toHaveURL(/\/manutencoes$/);
  });

  test('o alerta de CNH leva à lista já filtrada pelo nome (estado na URL)', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    await page.getByRole('link', { name: /CNH de Ana Souza venceu/ }).click();
    await expect(page).toHaveURL(/\/motoristas\?q=Ana(%20|\+)Souza/);
    await expect(page.getByLabel('Buscar por nome ou CNH')).toHaveValue('Ana Souza');
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });

  test('o alerta de frota leva à lista de veículos filtrada por status', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    await page.getByRole('link', { name: '1 veículo em manutenção' }).click();
    await expect(page).toHaveURL(/status=MANUTENCAO/);
    await expect(page.getByLabel('Filtrar por status')).toHaveValue('MANUTENCAO');
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });

  test('ordena por gravidade: crítico primeiro, informativo por último', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    const gravidades = await alertas(page).locator('.visually-hidden').allInnerTexts();
    expect(gravidades).toEqual(['Crítico:', 'Atenção:', 'Informação:']);
  });

  test('sem nada a avisar mostra "Nenhum alerta no momento."', async ({ page }) => {
    await mockApis(page, {
      dados: {
        manutencoes: [],
        veiculos: [{ id: 1, placa: 'AAA0001', modelo: 'X', anoFabricacao: 2020, quilometragem: 1, status: 'ATIVO' }],
        motoristas: [{ id: 1, nome: 'Ana', cnh: '1', categoriaCnh: 'C', vencimentoCnh: '2999-01-01', status: 'ATIVO' }],
      },
    });
    await page.goto('/dashboard');
    await carregado(page);
    await expect(page.getByText('Nenhum alerta no momento.')).toBeVisible();
    await expect(alertas(page)).toHaveCount(0);
  });

  test('mostra os 6 mais graves e avisa quantos ficaram de fora', async ({ page }) => {
    await mockApis(page, { volume: 'grande' });
    await page.goto('/dashboard');
    await carregado(page);
    await expect(alertas(page)).toHaveCount(6);
    await expect(page.getByText(/e mais \d+ alertas/)).toBeVisible();
  });

  test('nada do antigo texto fixo aparece', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    for (const antigo of ['João Silva', 'ABC-1234', 'Carlos Oliveira', '2 horas']) {
      await expect(page.getByText(antigo)).toHaveCount(0);
    }
  });
});

test.describe('gráficos', () => {
  test('rosca da frota e barras entregam os dados em tabelas para leitor de tela', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);

    const frota = page.getByRole('table', { name: 'Frota por situação' });
    await expect(frota.getByRole('row')).toHaveCount(3);
    await expect(frota.getByRole('row', { name: /Ativo 1 50%/ })).toBeAttached();
    await expect(frota.getByRole('row', { name: /Em manutenção 1 50%/ })).toBeAttached();

    const meses = page.getByRole('table', { name: 'Manutenções por mês' });
    await expect(meses.getByRole('row', { name: /mar\/2026 1 100%/ })).toBeAttached();

    const status = page.getByRole('table', { name: 'Entregas por status' });
    await expect(status.getByRole('row', { name: /Em trânsito 1 100%/ })).toBeAttached();
  });

  test('o desenho é escondido da árvore de acessibilidade e a legenda mostra rótulo + valor + %', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    await expect(page.locator('.donut__svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.legenda')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.legenda')).toContainText('Ativo');
    await expect(page.locator('.legenda')).toContainText('1 (50%)');
    await expect(page.getByText('Total: 2 veículos')).toBeVisible();
    await expect(page.locator('.barras').first()).toHaveAttribute('aria-hidden', 'true');
  });

  test('as cores vêm dos tokens e mudam com o tema (nada de cor fixa)', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    const cor = () => page.locator('.donut__segmento').first().evaluate((el) => getComputedStyle(el).stroke);
    const clara = await cor();
    // O app fixa data-theme ao iniciar: a troca é pelo botão de tema, como faz o usuário.
    await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect.poll(cor).not.toBe(clara);
  });

  test('sem dados: "Sem dados." e nenhuma fatia', async ({ page }) => {
    await mockApis(page, { dados: { veiculos: [], manutencoes: [], entregas: [], motoristas: [] } });
    await page.goto('/dashboard');
    await carregado(page);
    await expect(page.getByText('Sem dados.').first()).toBeVisible();
    await expect(page.locator('.donut__segmento')).toHaveCount(0);
  });
});

test.describe('rastreamento', () => {
  test('o atalho abre o app de rastreamento em nova aba, sem vazar o opener', async ({ page, context }) => {
    await context.route('http://localhost:3001/**', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Rastreamento</title>' })
    );
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    const link = page.getByRole('link', { name: /Ver no rastreamento/ }).first();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toContainText('(abre em nova aba)');
    const [aba] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await expect(aba).toHaveURL('http://localhost:3001/');
    expect(await aba.evaluate(() => window.opener)).toBeNull();
  });

  test('a tela de entregas tem o mesmo atalho', async ({ page }) => {
    await mockApis(page);
    await page.goto('/entregas');
    await expect(page.getByRole('link', { name: /Ver no rastreamento/ })).toHaveAttribute('href', 'http://localhost:3001');
  });
});

test.describe('indicadores nos cartões', () => {
  test('mostram em manutenção, atrasadas e CNH a vencer', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await carregado(page);
    const cartao = (nome: string) => page.locator('.stat-card', { hasText: nome });
    await expect(cartao('Veículos')).toContainText('1 em manutenção');
    await expect(cartao('Motoristas')).toContainText('1 com CNH vencida ou a vencer');
    await expect(cartao('Manutenções')).toContainText('1 atrasada');
  });
});

test.describe('celular', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sem rolagem horizontal; tabela das entregas vira cartões; gráficos cabem na largura', async ({ page }) => {
    await mockApis(page, { volume: 'grande' });
    await page.goto('/dashboard');
    await carregado(page);
    const { largura, janela } = await page.evaluate(() => ({
      largura: document.documentElement.scrollWidth,
      janela: document.documentElement.clientWidth,
    }));
    expect(largura).toBeLessThanOrEqual(janela);
    await expect(page.locator('app-data-table thead')).toBeHidden();
    for (const grafico of await page.locator('.grafico').all()) {
      const caixa = await grafico.boundingBox();
      expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(375);
    }
  });
});

for (const tema of ['light', 'dark'] as const) {
  for (const { nome, width, height } of [
    { nome: 'desktop', width: 1280, height: 800 },
    { nome: 'mobile', width: 375, height: 812 },
  ]) {
    test(`axe: dashboard completo, com gráficos e alertas (${tema}, ${nome})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme: tema });
      await mockApis(page, { volume: 'grande' });
      await page.goto('/dashboard');
      await carregado(page);
      await expect(page.locator('app-donut-chart')).toBeAttached();
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
      ).toEqual([]);
    });
  }
}
