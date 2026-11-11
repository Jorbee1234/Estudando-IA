import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0003, fase 4 (D3): listas com paginação, estado na URL, cartões no celular, densidade e Reativar.
const nav = (page: import('@playwright/test').Page, itens: string) =>
  page.getByRole('navigation', { name: `Paginação de ${itens}` });

test.describe('paginação e estado na URL', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { volume: 'grande' });
  });

  test('mostra 10 por página, informa a faixa e navega com o teclado', async ({ page }) => {
    await page.goto('/veiculos');
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(nav(page, 'veículos').getByText('1–10 de 57')).toBeVisible();
    await expect(nav(page, 'veículos').getByText('Página 1 de 6')).toBeVisible();
    await expect(nav(page, 'veículos').getByRole('button', { name: 'Página anterior' })).toBeDisabled();

    await nav(page, 'veículos').getByRole('button', { name: 'Próxima página' }).focus();
    await page.keyboard.press('Enter');
    await expect(nav(page, 'veículos').getByText('11–20 de 57')).toBeVisible();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(page.getByRole('button', { name: 'Ver detalhes do veículo AAA0011' })).toBeVisible();
  });

  test('o resumo é uma região aria-live polite', async ({ page }) => {
    await page.goto('/veiculos');
    const resumo = nav(page, 'veículos').locator('[aria-live="polite"]');
    await expect(resumo).toHaveCount(1);
    await expect(resumo).toContainText('1–10 de 57');
  });

  test('trocar o tamanho volta para a página 1 e vai para a URL', async ({ page }) => {
    await page.goto('/veiculos?pagina=3');
    await expect(nav(page, 'veículos').getByText('21–30 de 57')).toBeVisible();
    await nav(page, 'veículos').getByLabel('Por página').selectOption('25');
    await expect(page.locator('tbody tr')).toHaveCount(25);
    await expect(nav(page, 'veículos').getByText('1–25 de 57')).toBeVisible();
    await expect(page).toHaveURL(/tam=25/);
    await expect(page).not.toHaveURL(/pagina=/);
  });

  test('o botão voltar do navegador desfaz a mudança de página', async ({ page }) => {
    await page.goto('/veiculos');
    const proxima = nav(page, 'veículos').getByRole('button', { name: 'Próxima página' });
    await proxima.click();
    await proxima.click();
    await expect(nav(page, 'veículos').getByText('21–30 de 57')).toBeVisible();
    await page.goBack();
    await expect(nav(page, 'veículos').getByText('11–20 de 57')).toBeVisible();
    await page.goBack();
    await expect(nav(page, 'veículos').getByText('1–10 de 57')).toBeVisible();
  });

  test('recarregar a página mantém filtro, ordem e página', async ({ page }) => {
    await page.goto('/veiculos?q=scania&status=ATIVO&ordem=placa:desc&pagina=2&tam=10');
    const linhas = await page.locator('tbody tr td:nth-child(2) button').allInnerTexts();
    await page.reload();
    expect(await page.locator('tbody tr td:nth-child(2) button').allInnerTexts()).toEqual(linhas);
    await expect(page.getByLabel('Buscar por placa ou modelo')).toHaveValue('scania');
    await expect(page.getByLabel('Filtrar por status')).toHaveValue('ATIVO');
    await expect(page.locator('th[aria-sort="descending"]')).toContainText('Placa');
  });

  test('a busca só vai para a URL depois de parar de digitar, e filtrar volta para a página 1', async ({ page }) => {
    await page.goto('/veiculos?pagina=3');
    const busca = page.getByLabel('Buscar por placa ou modelo');
    await busca.pressSequentially('scan', { delay: 40 });
    // Sem esperar: ainda dentro dos 250 ms de debounce a URL não tem q=.
    expect(page.url()).not.toContain('q=');
    await expect(page).toHaveURL(/q=scan/);
    await expect(page).not.toHaveURL(/pagina=/);
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(nav(page, 'veículos').getByText('1–10 de 28')).toBeVisible();
  });

  test('"Limpar filtros" só aparece com filtro ativo e zera busca e status', async ({ page }) => {
    await page.goto('/veiculos');
    const limpar = page.getByRole('button', { name: 'Limpar filtros' });
    await expect(limpar).toHaveCount(0);
    await page.getByLabel('Filtrar por status').selectOption('MANUTENCAO');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(limpar).toBeVisible();
    await limpar.click();
    await expect(limpar).toHaveCount(0);
    await expect(page).not.toHaveURL(/status=/);
    await expect(nav(page, 'veículos').getByText('1–10 de 57')).toBeVisible();
  });

  test('um link com ?id= abre o detalhe, com o foco no título, e fechar tira o id da URL', async ({ page }) => {
    await page.goto('/veiculos?id=3');
    const titulo = page.getByRole('heading', { name: /AAA0003 - Volvo FH/ });
    await expect(titulo).toBeVisible();
    await expect(titulo).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(titulo).toHaveCount(0);
    await expect(page).not.toHaveURL(/id=/);
  });

  test('clicar numa linha grava o id na URL (link copiável)', async ({ page }) => {
    await page.goto('/veiculos');
    await page.getByRole('button', { name: 'Ver detalhes do veículo AAA0002' }).click();
    await expect(page).toHaveURL(/id=2/);
  });

  test('ordenar pelo cabeçalho grava ordem na URL e atualiza aria-sort', async ({ page }) => {
    await page.goto('/veiculos');
    const th = page.getByRole('columnheader', { name: /Placa/ });
    await th.getByRole('button').click();
    await expect(page).toHaveURL(/ordem=placa:asc/);
    await expect(th).toHaveAttribute('aria-sort', 'ascending');
    await th.getByRole('button').click();
    await expect(page).toHaveURL(/ordem=placa:desc/);
    await expect(page.locator('tbody tr').first()).toContainText('AAA0057');
  });

  test('URL editada à mão (valores inválidos) não quebra a tela', async ({ page }) => {
    await page.goto('/veiculos?pagina=abc&tam=7&ordem=foo:bar&id=-3&pagina=0');
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(nav(page, 'veículos').getByText('1–10 de 57')).toBeVisible();
  });

  test('página além do fim cai na última', async ({ page }) => {
    await page.goto('/veiculos?pagina=99');
    await expect(nav(page, 'veículos').getByText('51–57 de 57')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(7);
  });

  test('motoristas, entregas e manutenções também paginam, com a URL', async ({ page }) => {
    await page.goto('/motoristas?pagina=3');
    await expect(nav(page, 'motoristas').getByText('21–23 de 23')).toBeVisible();
    await page.goto('/entregas?q=PED-00&status=ENTREGUE');
    await expect(nav(page, 'entregas').getByText(/1–10 de 26/)).toBeVisible();
    await page.goto('/manutencoes?tam=25');
    await expect(page.locator('tbody tr')).toHaveCount(25);
    await expect(page.getByText('Serviço 25')).toBeVisible();
  });

  test('entrega aberta por link (?id=)', async ({ page }) => {
    await page.goto('/entregas?id=4');
    await expect(page.getByRole('heading', { name: /Entrega PED-0004/ })).toBeFocused();
  });
});

test.describe('lista curta', () => {
  test('com poucos itens o paginador mostra só o resumo', async ({ page }) => {
    await mockApis(page);
    await page.goto('/veiculos');
    await expect(nav(page, 'veículos').getByText('1–2 de 2')).toBeVisible();
    await expect(nav(page, 'veículos').getByRole('button')).toHaveCount(0);
    await expect(nav(page, 'veículos').getByLabel('Por página')).toHaveCount(0);
  });
});

test.describe('Reativar veículo', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { volume: 'grande' });
  });

  test('veículo INATIVO mostra Reativar (não Desativar); o fluxo chama PATCH reativar', async ({ page }) => {
    const patches: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'PATCH') patches.push(new URL(r.url()).pathname);
    });
    await page.goto('/veiculos?q=AAA0005');
    const linha = page.getByRole('row', { name: /AAA0005/ });
    await expect(linha).toContainText('Inativo');
    await expect(linha.getByRole('button', { name: 'Desativar' })).toHaveCount(0);

    await linha.getByRole('button', { name: 'Reativar' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Reativar veículo' });
    await expect(dialogo).toBeVisible();
    // Ação de recuperação: o botão não usa a variante de perigo.
    await expect(dialogo.getByRole('button', { name: 'Reativar' })).not.toHaveClass(/btn--danger/);
    await dialogo.getByRole('button', { name: 'Reativar' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'AAA0005 reativado' })).toBeVisible();
    expect(patches).toEqual(['/api/veiculos/5/reativar']);
    await expect(linha).toContainText('Ativo');
    await expect(linha.getByRole('button', { name: 'Desativar' })).toBeVisible();
  });

  test('veículo em MANUTENCAO nunca mostra Reativar (a API o forçaria para ATIVO)', async ({ page }) => {
    await page.goto('/veiculos?q=AAA0006');
    const linha = page.getByRole('row', { name: /AAA0006/ });
    await expect(linha).toContainText('Em manutenção');
    await expect(linha.getByRole('button', { name: 'Reativar' })).toHaveCount(0);
    await expect(linha.getByRole('button', { name: 'Desativar' })).toBeVisible();
  });

  test('cancelar o diálogo não chama a API', async ({ page }) => {
    let chamou = false;
    page.on('request', (r) => {
      if (r.method() === 'PATCH') chamou = true;
    });
    await page.goto('/veiculos?q=AAA0005');
    await page.getByRole('button', { name: 'Reativar' }).click();
    // O <dialog> abre depois do render: só então o Esc o alcança.
    await expect(page.getByRole('dialog', { name: 'Reativar veículo' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(chamou).toBe(false);
  });
});

test.describe('densidade', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { volume: 'grande' });
  });

  test('o modo compacto reduz as linhas, vale para o app todo e é lembrado ao recarregar', async ({ page }) => {
    await page.goto('/veiculos');
    const altura = async () => (await page.locator('tbody tr').first().boundingBox())?.height ?? 0;
    const confortavel = await altura();
    const botao = page.getByRole('button', { name: 'Modo compacto' });
    await expect(botao).toHaveAttribute('aria-pressed', 'false');

    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-densidade', 'compacta');
    expect(await altura()).toBeLessThan(confortavel);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-densidade', 'compacta');
    await page.goto('/motoristas');
    await expect(page.getByRole('button', { name: 'Modo compacto' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Modo compacto' }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-densidade', /.+/);
  });

  test('mesmo compacto, os botões de ação têm pelo menos 24 px de altura (WCAG 2.2)', async ({ page }) => {
    await page.goto('/veiculos');
    await page.getByRole('button', { name: 'Modo compacto' }).click();
    for (const b of await page.locator('tbody .btn').all()) {
      expect((await b.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(24);
    }
  });
});

test.describe('telas estreitas (cartões)', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test.beforeEach(async ({ page }) => {
    await mockApis(page, { volume: 'grande' });
  });

  test('cada linha vira um cartão: cabeçalho some, cada célula mostra o rótulo, sem rolagem horizontal', async ({ page }) => {
    await page.goto('/veiculos');
    // Espera os dados: "thead oculto" também é verdade enquanto a tabela nem existe (esqueleto).
    await expect(page.getByRole('button', { name: 'Ver detalhes do veículo AAA0001' })).toBeVisible();
    await expect(page.locator('thead')).toBeHidden();
    const rotulos = await page.locator('tbody tr').first().locator('td').evaluateAll((tds) =>
      tds.map((td) => getComputedStyle(td, '::before').content.replace(/"/g, ''))
    );
    expect(rotulos).toEqual(['ID', 'Placa', 'Modelo', 'Ano', 'Status', 'KM Atual', 'Ações']);
    const { largura, janela } = await page.evaluate(() => ({
      largura: document.documentElement.scrollWidth,
      janela: document.documentElement.clientWidth,
    }));
    expect(largura).toBeLessThanOrEqual(janela);
  });

  test('o seletor "Ordenar por" aparece só aqui e reordena a lista (e a URL)', async ({ page }) => {
    await page.goto('/veiculos');
    const seletor = page.getByLabel('Ordenar por');
    await expect(seletor).toBeVisible();
    await seletor.selectOption('placa:desc');
    await expect(page).toHaveURL(/ordem=placa:desc/);
    await expect(page.locator('tbody tr').first()).toContainText('AAA0057');
  });

  test('as ações continuam acessíveis dentro do cartão', async ({ page }) => {
    await page.goto('/veiculos');
    const linha = page.locator('tbody tr').first();
    await expect(linha.getByRole('button', { name: 'Editar' })).toBeVisible();
    await expect(linha.getByRole('button', { name: 'Desativar' })).toBeVisible();
  });

  test('a linha toda continua clicável para abrir o detalhe', async ({ page }) => {
    await page.goto('/veiculos');
    await page.locator('tbody tr').first().click({ position: { x: 20, y: 20 } });
    await expect(page).toHaveURL(/id=1/);
  });
});

test('o seletor "Ordenar por" não existe no desktop (o cabeçalho ordena)', async ({ page }) => {
  await mockApis(page);
  await page.goto('/veiculos');
  await expect(page.getByLabel('Ordenar por')).toBeHidden();
});

test('o cabeçalho fica fixo ao rolar a tabela (50 linhas)', async ({ page }) => {
  await mockApis(page, { volume: 'grande' });
  await page.goto('/veiculos?tam=50');
  const cab = page.locator('thead th').first();
  const antes = (await cab.boundingBox())?.y ?? 0;
  await page.locator('.table-wrap').evaluate((el) => (el.scrollTop = 600));
  const depois = (await cab.boundingBox())?.y ?? 0;
  expect(Math.abs(depois - antes)).toBeLessThan(2);
});

// Acessibilidade das listas novas: zebra, cabeçalho fixo, paginador, cartões e densidade.
const listas = [
  { rota: 'veiculos', itens: 'veículos' },
  { rota: 'motoristas', itens: 'motoristas' },
  { rota: 'manutencoes', itens: 'manutenções' },
  { rota: 'entregas', itens: 'entregas' },
];

for (const tema of ['light', 'dark'] as const) {
  for (const { nome, width, height } of [
    { nome: 'desktop', width: 1280, height: 800 },
    { nome: 'mobile', width: 375, height: 812 },
  ]) {
    for (const { rota, itens } of listas) {
      test(`axe: /${rota} paginada (${tema}, ${nome}), também no modo compacto`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ colorScheme: tema });
        await mockApis(page, { volume: 'grande' });
        await page.goto(`/${rota}`);
        await expect(nav(page, itens)).toBeVisible();
        for (const compacto of [false, true]) {
          if (compacto) await page.getByRole('button', { name: 'Modo compacto' }).click();
          const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
          expect(
            violations
              .filter((v) => v.impact === 'serious' || v.impact === 'critical')
              .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
          ).toEqual([]);
        }
      });
    }
  }
}
