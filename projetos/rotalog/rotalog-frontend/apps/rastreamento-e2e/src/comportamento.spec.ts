import { buscar, expect, mockPedido, pedido, test } from './fixtures';

test('o portal sobe sem violar a CSP e sem chamar domínios externos além dos tiles', async ({ api: page }) => {
  const violacoes: string[] = [];
  const externos: string[] = [];
  page.on('console', (m) => {
    if (m.text().includes('Content Security Policy')) violacoes.push(m.text());
  });
  page.on('request', (r) => {
    const u = new URL(r.url());
    const local = ['localhost', '127.0.0.1'].includes(u.hostname);
    if (u.protocol.startsWith('http') && !local && !u.hostname.endsWith('tile.openstreetmap.org')) externos.push(r.url());
  });
  await mockPedido(page, 'PED-001', pedido());
  await page.goto('/');
  await buscar(page, 'PED-001');
  await expect(page.getByRole('heading', { name: 'Pedido PED-001' })).toBeVisible();
  expect(violacoes).toEqual([]);
  expect(externos).toEqual([]);
});

test('o XSS no endereço e na descrição não executa e aparece como texto no popup', async ({ api: page }) => {
  const xss = '<img src=x onerror="window.__xss=1">';
  await mockPedido(
    page,
    'XSS',
    pedido({
      pedido: 'XSS',
      origem: xss,
      destino: xss,
      eventos: [{ id: '1', evento: 'POSICAO_ATUALIZADA', descricao: xss, latitude: '-23.6', longitude: '-46.62', data_evento: '2026-11-01T10:30:00.000Z' }],
    }),
  );
  await page.goto('/');
  await buscar(page, 'XSS');
  await page.locator('.leaflet-marker-icon').first().click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('<img src=x');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await page.locator('.leaflet-popup-content img').count()).toBe(0);
});

test('navega só com o teclado: Tab chega ao campo e Enter busca', async ({ api: page }) => {
  await mockPedido(page, 'PED-001', pedido());
  await page.goto('/');
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // campo
  await expect(page.getByLabel('Número do pedido')).toBeFocused();
  await page.keyboard.type('PED-001');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Pedido PED-001' })).toBeVisible();
});

test('API fora do ar mostra erro sem destruir o mapa e se recupera', async ({ api: page }) => {
  await page.route('http://localhost:3000/api/rastreamento/pedido/CAIU', (r) => r.abort());
  await page.goto('/');
  await buscar(page, 'CAIU');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('region', { name: /Mapa/ })).toBeVisible();
  await page.unroute('http://localhost:3000/api/rastreamento/pedido/CAIU');
  await mockPedido(page, 'CAIU', pedido({ pedido: 'CAIU' }));
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Pedido CAIU' })).toBeVisible();
});

test('abrir a URL com ?pedido= já mostra o pedido e recarregar mantém a consulta', async ({ api: page }) => {
  await mockPedido(page, 'PED-001', pedido());
  await page.goto('/?pedido=PED-001');
  await expect(page.getByRole('heading', { name: 'Pedido PED-001' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pedido PED-001' })).toBeVisible();
  expect(page.url()).toContain('?pedido=PED-001');
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('o mapa renderiza inteiro depois de ficar oculto na aba Detalhes', async ({ api: page }) => {
    await mockPedido(page, 'PED-001', pedido());
    await page.goto('/');
    await buscar(page, 'PED-001');
    await expect(page.getByRole('tab', { name: 'Detalhes' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Mapa' }).click();

    const mapa = page.locator('.leaflet-container');
    await expect(mapa).toBeVisible();
    const caixa = await mapa.boundingBox();
    expect(caixa?.width).toBeGreaterThan(300);
    expect(caixa?.height).toBeGreaterThan(300);
    // Tiles carregados cobrem a área visível (sem faixas cortadas por tamanho errado)
    await expect.poll(() => page.locator('.leaflet-tile-loaded').count()).toBeGreaterThan(1);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(3);
  });

  test('alvos de toque principais têm pelo menos 44 px', async ({ api: page }) => {
    await mockPedido(page, 'PED-001', pedido());
    await page.goto('/');
    await buscar(page, 'PED-001');
    for (const alvo of [page.getByRole('button', { name: 'Rastrear' }), page.getByRole('tab', { name: 'Mapa' }), page.getByRole('button', { name: 'Copiar link' })]) {
      const caixa = await alvo.boundingBox();
      expect(caixa?.height).toBeGreaterThanOrEqual(43.5);
    }
  });
});

test('com prefers-reduced-motion não há animação contínua (skeleton e pulso do veículo)', async ({ api: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('http://localhost:3000/api/rastreamento/pedido/LENTO', () => new Promise(() => undefined));
  await page.goto('/');
  await buscar(page, 'LENTO');
  const bloco = page.locator('[aria-busy="true"] > div > div').first();
  await expect(bloco).toBeVisible();
  const estilo = await bloco.evaluate((el) => {
    const e = getComputedStyle(el);
    return { duracao: e.animationDuration, repeticoes: e.animationIterationCount };
  });
  expect(parseFloat(estilo.duracao)).toBeLessThan(0.001);
  expect(estilo.repeticoes).toBe('1');
});
