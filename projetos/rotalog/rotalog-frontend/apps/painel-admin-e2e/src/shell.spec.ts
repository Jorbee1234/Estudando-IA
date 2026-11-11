import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { mockApis } from './fixtures';

// O lib.dom do TypeScript do projeto ainda não tipa a View Transitions API.
interface Transicao {
  ready: Promise<void>;
}
type DocumentoComTransicao = Document & { startViewTransition?: (cb: () => void) => Transicao };

// ADR 0003, fase 6 (D6): menu recolhido com dicas acessíveis, transição entre rotas e acabamento.
const largura = (page: Page, seletor: string) =>
  page.locator(seletor).evaluate((el) => el.getBoundingClientRect().width);

/** Item do menu lateral (os cartões do dashboard também são links com o mesmo nome). */
const item = (page: Page, nome: string) =>
  page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: nome });

const recolher = (page: Page) => page.getByRole('button', { name: 'Recolher menu' });
const expandir = (page: Page) => page.getByRole('button', { name: 'Expandir menu' });

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test.describe('menu recolhido (desktop)', () => {
  test('recolher reduz o menu a ícones, o conteúdo acompanha e o estado vai para o <html>', async ({ page }) => {
    await page.goto('/dashboard');
    expect(await largura(page, '.sidebar')).toBeCloseTo(250, 0);
    await expect(page.locator('html')).not.toHaveAttribute('data-sidebar', /.+/);

    await recolher(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'recolhida');
    await expect.poll(() => largura(page, '.sidebar')).toBeCloseTo(72, 0);
    // O conteúdo ocupa o espaço liberado: a margem esquerda acompanha a largura do menu.
    await expect
      .poll(() => page.locator('.main-wrapper').evaluate((el) => parseFloat(getComputedStyle(el).marginLeft)))
      .toBeCloseTo(72, 0);
    await expect(expandir(page)).toHaveAttribute('aria-expanded', 'false');

    await expandir(page).click();
    await expect.poll(() => largura(page, '.sidebar')).toBeCloseTo(250, 0);
    await expect(page.locator('html')).not.toHaveAttribute('data-sidebar', /.+/);
  });

  test('recolhido, os links continuam com nome acessível e o item ativo continua marcado', async ({ page }) => {
    await page.goto('/veiculos');
    await recolher(page).click();
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    for (const nome of ['Dashboard', 'Veículos', 'Motoristas', 'Manutenções', 'Entregas']) {
      await expect(nav.getByRole('link', { name: nome })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Veículos' })).toHaveAttribute('aria-current', 'page');
    // O texto do rótulo some da vista, mas não do leitor de tela.
    const rotulo = nav.getByRole('link', { name: 'Veículos' }).locator('.rotulo');
    expect((await rotulo.boundingBox())?.width ?? 99).toBeLessThanOrEqual(1);
    await expect(rotulo).toHaveText('Veículos');
  });

  test('a escolha é lembrada ao recarregar e vale para todas as telas', async ({ page }) => {
    await page.goto('/dashboard');
    await recolher(page).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'recolhida');
    await expect.poll(() => largura(page, '.sidebar')).toBeCloseTo(72, 0);
    await item(page, 'Motoristas').click();
    await expect(page).toHaveURL(/\/motoristas$/);
    await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'recolhida');
  });

  test('funciona só pelo teclado (Tab até o botão, Enter alterna)', async ({ page }) => {
    await page.goto('/dashboard');
    await recolher(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'recolhida');
    await expect(expandir(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).not.toHaveAttribute('data-sidebar', /.+/);
  });

  test('a dica do item aparece com o mouse e com o foco, e some ao sair', async ({ page }) => {
    await page.goto('/dashboard');
    await recolher(page).click();
    const veiculos = item(page, 'Veículos');
    const dica = () => veiculos.evaluate((el) => {
      const c = getComputedStyle(el, '::after');
      return { texto: c.content, opacidade: c.opacity, visibilidade: c.visibility };
    });
    await expect.poll(async () => (await dica()).opacidade).toBe('0');
    expect((await dica()).texto).toBe('"Veículos"');

    await veiculos.hover();
    await expect.poll(async () => (await dica()).opacidade).toBe('1');
    await page.mouse.move(600, 400);
    await expect.poll(async () => (await dica()).opacidade).toBe('0');

    await item(page, 'Motoristas').focus();
    await page.keyboard.press('Shift+Tab'); // foco por teclado em "Veículos"
    await expect.poll(async () => (await dica()).opacidade).toBe('1');
  });

  test('Esc dispensa a dica (WCAG 1.4.13) e ela volta ao mudar de item', async ({ page }) => {
    await page.goto('/dashboard');
    await recolher(page).click();
    const veiculos = item(page, 'Veículos');
    const motoristas = item(page, 'Motoristas');
    const exibe = (l: typeof veiculos) => l.evaluate((el) => getComputedStyle(el, '::after').display);
    await veiculos.focus();
    await page.keyboard.press('Tab'); // some o foco de "recolher" -> primeiro item; garante foco por teclado
    await veiculos.focus();
    await page.keyboard.press('Escape');
    expect(await exibe(veiculos)).toBe('none');
    await motoristas.hover();
    await expect.poll(() => exibe(motoristas)).not.toBe('none');
  });

  test('dica e menu recolhido passam no axe nos dois temas', async ({ page }) => {
    for (const tema of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: tema });
      await page.goto('/dashboard');
      await recolher(page).click();
      await item(page, 'Entregas').focus();
      await page.keyboard.press('Shift+Tab');
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
      ).toEqual([]);
      await page.evaluate(() => localStorage.clear());
    }
  });

  test('os botões do rodapé também ficam só com ícone (rótulo continua acessível)', async ({ page }) => {
    await page.goto('/veiculos');
    await recolher(page).click();
    await expect(page.getByRole('button', { name: 'Tema escuro' })).toBeVisible();
    const largura_ = await page.getByRole('button', { name: 'Tema escuro' }).evaluate((b) => b.getBoundingClientRect().width);
    expect(largura_).toBeLessThan(72);
  });
});

test.describe('telas estreitas', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('a gaveta não é afetada pelo recolhimento: sem botão de recolher e com largura total', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rotalog.sidebar', 'recolhida'));
    await page.goto('/dashboard');
    await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'recolhida');
    expect(await largura(page, '.sidebar')).toBeCloseTo(375, 0);
    await expect(page.locator('.main-wrapper')).toHaveCSS('margin-left', '0px');

    await page.getByRole('button', { name: 'Abrir menu' }).click();
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav.getByRole('link', { name: 'Entregas' })).toBeVisible();
    // Na gaveta os rótulos aparecem por extenso e o botão de recolher não existe.
    expect((await nav.getByRole('link', { name: 'Entregas' }).locator('.rotulo').boundingBox())?.width ?? 0).toBeGreaterThan(20);
    await expect(recolher(page)).toBeHidden();
  });
});

test.describe('transição entre rotas', () => {
  test('o conteúdo troca com uma View Transition quando o movimento é permitido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      const w = window as unknown as { __vt: number };
      w.__vt = 0;
      const doc = document as DocumentoComTransicao;
      const original = doc.startViewTransition?.bind(doc);
      if (original) {
        doc.startViewTransition = ((cb: () => void) => {
          w.__vt++;
          return original(cb);
        }) as NonNullable<DocumentoComTransicao['startViewTransition']>;
      }
    });
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Veículos', exact: true }).click();
    await expect(page).toHaveURL(/\/veiculos$/);
    await expect(page.getByRole('heading', { name: 'Gestão de Veículos' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThan(0);
  });

  test('com movimento reduzido a transição é pulada e a navegação continua funcionando', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const w = window as unknown as { __pulada: Promise<string>[] };
      w.__pulada = [];
      const doc = document as DocumentoComTransicao;
      const original = doc.startViewTransition?.bind(doc);
      if (original) {
        doc.startViewTransition = ((cb: () => void) => {
          const t = original(cb);
          w.__pulada.push(t.ready.then(() => 'executada', () => 'pulada'));
          return t;
        }) as NonNullable<DocumentoComTransicao['startViewTransition']>;
      }
    });
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Motoristas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gestão de Motoristas' })).toBeVisible();
    const resultados = await page.evaluate(() => Promise.all((window as unknown as { __pulada: Promise<string>[] }).__pulada));
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every((r) => r === 'pulada')).toBe(true);
  });

  test('mudar só a query (página, filtro, item aberto) não anima; trocar de tela anima', async ({ page }) => {
    await mockApis(page, { volume: 'grande' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      const w = window as unknown as { __resultados: Promise<string>[] };
      w.__resultados = [];
      const doc = document as DocumentoComTransicao;
      const original = doc.startViewTransition?.bind(doc);
      if (original) {
        doc.startViewTransition = ((cb: () => void) => {
          const t = original(cb);
          w.__resultados.push(t.ready.then(() => 'executada', () => 'pulada'));
          return t;
        }) as NonNullable<DocumentoComTransicao['startViewTransition']>;
      }
    });
    const resultados = () =>
      page.evaluate(() => Promise.all((window as unknown as { __resultados: Promise<string>[] }).__resultados));

    await page.goto('/veiculos');
    await page.getByRole('navigation', { name: 'Paginação de veículos' }).getByRole('button', { name: 'Próxima página' }).click();
    await expect(page).toHaveURL(/pagina=2/);
    expect(await resultados()).toEqual(['pulada']);

    await item(page, 'Motoristas').click();
    await expect(page).toHaveURL(/\/motoristas$/);
    expect(await resultados()).toEqual(['pulada', 'executada']);
  });

  test('dois cliques rápidos em "Próxima" mantêm as duas entradas do histórico (o voltar passa pela página 2)', async ({ page }) => {
    await mockApis(page, { volume: 'grande' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/veiculos');
    const proxima = page.getByRole('navigation', { name: 'Paginação de veículos' }).getByRole('button', { name: 'Próxima página' });
    await proxima.click();
    await proxima.click();
    await expect(page.getByText('21–30 de 57')).toBeVisible();
    await page.goBack();
    await expect(page.getByText('11–20 de 57')).toBeVisible();
    await page.goBack();
    await expect(page.getByText('1–10 de 57')).toBeVisible();
  });

  test('a primeira carga não faz transição', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __vt: number };
      w.__vt = 0;
      const doc = document as DocumentoComTransicao;
      const original = doc.startViewTransition?.bind(doc);
      if (original) {
        doc.startViewTransition = ((cb: () => void) => {
          w.__vt++;
          return original(cb);
        }) as NonNullable<DocumentoComTransicao['startViewTransition']>;
      }
    });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBe(0);
  });

  test('só o conteúdo tem transição nomeada (a sidebar não pisca)', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.main-wrapper')).toHaveCSS('view-transition-name', 'conteudo');
    await expect(page.locator('.sidebar')).toHaveCSS('view-transition-name', 'none');
  });
});

test.describe('animações de entrada', () => {
  test('toast entra com animação; com movimento reduzido ela é praticamente instantânea', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/manutencoes');
    await page.getByRole('button', { name: '+ Nova Manutenção' }).click();
    const toast = page.getByRole('status').filter({ hasText: 'não implementada' });
    await expect(toast).toBeVisible();
    expect(await toast.evaluate((el) => getComputedStyle(el).animationName)).toBe('toast-entra');
    expect(await toast.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))).toBeGreaterThan(0.1);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.getByRole('button', { name: '+ Nova Manutenção' }).click();
    const toast2 = page.getByRole('status').filter({ hasText: 'não implementada' });
    await expect(toast2).toBeVisible();
    expect(await toast2.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))).toBeLessThan(0.01);
  });

  test('o diálogo de confirmação entra com animação (fundo e caixa)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/veiculos');
    await page.getByRole('row', { name: /ABC1D23/ }).getByRole('button', { name: 'Desativar' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Desativar veículo' });
    await expect(dialogo).toBeVisible();
    expect(await dialogo.evaluate((el) => getComputedStyle(el).animationName)).toBe('dialogo-entra');
    expect(await dialogo.evaluate((el) => getComputedStyle(el, '::backdrop').animationName)).toBe('fundo-entra');
  });
});

test.describe('estados de interação', () => {
  test('o cartão do dashboard levanta com o foco por teclado e a linha de tabela destaca o foco interno', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/dashboard');
    const cartao = page.locator('.stat-card').first();
    await expect(cartao).toBeVisible();
    await cartao.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect.poll(() => cartao.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');

    await page.goto('/veiculos');
    const linha = page.locator('tbody tr').first();
    const fundoAntes = await linha.evaluate((el) => getComputedStyle(el).backgroundColor);
    await linha.getByRole('button', { name: /Ver detalhes/ }).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect.poll(() => linha.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(fundoAntes);
  });

  test('botão pressionado afunda 1px (e some com movimento reduzido nas durações)', async ({ page }) => {
    await page.goto('/veiculos');
    const botao = page.getByRole('button', { name: '+ Novo Veículo' });
    const antes = await botao.boundingBox();
    await page.mouse.move((antes?.x ?? 0) + 10, (antes?.y ?? 0) + 10);
    await page.mouse.down();
    const durante = await botao.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.up();
    expect(durante).not.toBe('none');
  });
});
