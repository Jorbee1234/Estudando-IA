import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import App from './App';
import { leafletFake as fake, resetarLeafletFake } from '../test/leafletFake';
import { evento, jsonResponse, pedido, XSS } from '../test/fixtures';
import { mockLeaflet, renderComQuery } from '../test/utils';

jest.mock('leaflet', () => mockLeaflet());

let fetchMock: jest.Mock;
const base = 'http://localhost:3000';
const responder = (rotas: Record<string, () => Promise<Response>>) =>
  fetchMock.mockImplementation((url: string) => {
    const handler = rotas[url.replace(base, '')];
    return handler ? handler() : jsonResponse({ error: 'Pedido não encontrado' }, 404);
  });
const urls = () => fetchMock.mock.calls.map(([u]) => String(u));

beforeEach(() => {
  resetarLeafletFake();
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  window.history.replaceState(null, '', '/');
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const buscar = async (numero = 'PED-001') => {
  await userEvent.type(screen.getByLabelText('Número do pedido'), numero);
  await userEvent.click(screen.getByRole('button', { name: 'Rastrear' }));
};

describe('App: portal público (busca por pedido)', () => {
  it('mostra a tela inicial, sem mapa, sem lista e sem consultar nada antes da busca', () => {
    renderComQuery(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Acompanhe sua entrega' })).toBeInTheDocument();
    expect(screen.getByText(/O número do pedido está no e-mail ou SMS/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Mapa com origem/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('depois da busca mostra o mapa e passa a busca para o cabeçalho (compacta)', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    expect(await screen.findByRole('region', { name: /Mapa com origem/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Acompanhe sua entrega' })).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toContainElement(screen.getByLabelText('Número do pedido'));
    expect(screen.getByLabelText('Número do pedido')).toHaveValue('PED-001');
  });

  it('o botão só habilita com número preenchido e a busca usa o endpoint do pedido', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    expect(screen.getByRole('button', { name: 'Rastrear' })).toBeDisabled();
    await buscar();
    expect(await screen.findByRole('heading', { name: 'Pedido PED-001' })).toBeInTheDocument();
    expect(urls()).toEqual([`${base}/api/rastreamento/pedido/PED-001`]);
    expect(urls().some((u) => u.endsWith('/api/entregas') || u.includes('/api/entregas/'))).toBe(false);
  });

  it('não exibe motorista nem placa', async () => {
    responder({
      '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido({ motorista_nome: 'João', veiculo_placa: 'ABC1D23' })),
    });
    renderComQuery(<App />);
    await buscar();
    await screen.findByRole('heading', { name: 'Pedido PED-001' });
    expect(screen.queryByText(/João|ABC1D23|Motorista/)).not.toBeInTheDocument();
  });

  it('pedido inexistente (404) mostra mensagem e não é erro de API', async () => {
    responder({});
    renderComQuery(<App />);
    await buscar('NAO-EXISTE');
    expect(await screen.findByText(/Pedido NAO-EXISTE não encontrado/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pedido PENDENTE sem eventos mostra o estado vazio da timeline, sem erro', async () => {
    responder({ '/api/rastreamento/pedido/P1': () => jsonResponse(pedido({ pedido: 'P1', status: 'PENDENTE', eventos: [] })) });
    renderComQuery(<App />);
    await buscar('P1');
    expect(await screen.findByText('Sem eventos registrados.')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Pendente');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('erro 429 (rate limit) mostra alerta com "Tentar novamente" sem destruir o mapa, e se recupera', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse({ error: 'Muitas consultas. Tente novamente em instantes.' }, 429) });
    renderComQuery(<App />);
    await buscar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas consultas');
    expect(fake.mapsCreated).toBe(1);

    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Pedido PED-001' })).toBeInTheDocument();
    expect(fake.mapsCreated).toBe(1);
    expect(fake.mapsRemoved).toBe(0);
  });

  it('resposta fora do formato leva ao erro da região, não a erro de render', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse({ nao: 'e um pedido' }) });
    renderComQuery(<App />);
    await buscar();
    expect(await screen.findByRole('alert')).toHaveTextContent(/fora do formato/);
  });

  it('move o foco para o painel de detalhes ao buscar', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    await screen.findByRole('list', { name: 'Etapas da entrega' });
    expect(document.activeElement).toHaveAttribute('tabindex', '-1');
  });

  it('busca com Enter no campo', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await userEvent.type(screen.getByLabelText('Número do pedido'), 'PED-001{Enter}');
    expect(await screen.findByRole('heading', { name: 'Pedido PED-001' })).toBeInTheDocument();
  });

  it('não tem violações do axe (inicial, com pedido e não encontrado)', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    const { container } = renderComQuery(<App />);
    await screen.findByRole('heading', { name: 'Acompanhe sua entrega' });
    expect(await axe(container)).toHaveNoViolations();

    await buscar();
    await screen.findByRole('list', { name: 'Etapas da entrega' });
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.clear(screen.getByLabelText('Número do pedido'));
    await buscar('OUTRO');
    await screen.findByText(/Pedido OUTRO não encontrado/);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('App: resultado', () => {
  it('mostra o resumo do status, a linha de etapas com a etapa atual e as concluídas', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    expect(await screen.findByText('Seu pedido está a caminho do destino.')).toBeInTheDocument();
    const etapas = within(screen.getByRole('list', { name: 'Etapas da entrega' })).getAllByRole('listitem');
    expect(etapas).toHaveLength(4);
    expect(etapas[0]).toHaveTextContent('concluída');
    expect(etapas[1]).toHaveTextContent('concluída');
    expect(etapas[2]).toHaveAttribute('aria-current', 'step');
    expect(etapas[3]).not.toHaveAttribute('aria-current');
  });

  it.each([
    ['CANCELADA', 'Este pedido foi cancelado.'],
    ['NOVO_STATUS', 'Não foi possível identificar a situação deste pedido.'],
  ])('status %s não segue o fluxo: mostra aviso em vez da linha de etapas', async (status, texto) => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido({ status })) });
    renderComQuery(<App />);
    await buscar();
    expect(await screen.findByRole('note')).toHaveTextContent(texto);
    expect(screen.queryByRole('list', { name: 'Etapas da entrega' })).not.toBeInTheDocument();
  });

  it('a timeline usa rótulos em português, ícone por tipo e data completa no title', async () => {
    const eventos = [
      evento({ id: 3 }),
      evento({ id: 2, evento: 'STATUS_ALTERADO', latitude: null, longitude: null, data_evento: '2026-11-01T09:00:00.000Z' }),
      evento({ id: 1, evento: 'PEDIDO_CRIADO', latitude: null, longitude: null, data_evento: '2026-11-01T08:00:00.000Z' }),
    ];
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido({ eventos })) });
    renderComQuery(<App />);
    await buscar();
    await screen.findByRole('heading', { name: 'Histórico' });
    expect(screen.getByText('Pedido criado')).toBeInTheDocument();
    expect(screen.getByText('Status alterado')).toBeInTheDocument();
    expect(screen.getByText('Posição atualizada')).toBeInTheDocument();
    expect(screen.queryByText(/POSICAO_ATUALIZADA|STATUS_ALTERADO/)).not.toBeInTheDocument();
    expect(document.querySelector('ol time')).toHaveAttribute('title');
  });

  it('mostra "Atualizado às" e copia o link da consulta, anunciando a confirmação', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    expect(await screen.findByText(/Atualizado às \d{2}:\d{2}/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('?pedido=PED-001'));
    expect(await screen.findByRole('button', { name: 'Link copiado!' })).toBeInTheDocument();
  });

  it('falha ao copiar (sem permissão) não quebra a tela', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: jest.fn().mockRejectedValue(new Error('negado')) }, configurable: true });
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar link' }));
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
  });
});

describe('App: estados', () => {
  it('enquanto busca mostra o skeleton ocupado e anuncia "Buscando pedido..."', async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    renderComQuery(<App />);
    await buscar();
    const regiao = await screen.findByLabelText('Carregando pedido');
    expect(regiao).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Buscando pedido...');
    expect(regiao.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('pedido não encontrado tem título, orientação e nenhum botão de nova tentativa', async () => {
    responder({});
    renderComQuery(<App />);
    await buscar('ZZZ');
    expect(await screen.findByText('Não encontramos esse pedido')).toBeInTheDocument();
    expect(screen.getByText(/Confira o número no e-mail ou SMS/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('erro mostra título e a mensagem da API (ex.: 429)', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse({ error: 'Muitas consultas. Tente novamente em instantes.' }, 429) });
    renderComQuery(<App />);
    await buscar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível buscar o pedido');
    expect(alerta).toHaveTextContent('Muitas consultas');
  });
});

describe('App: telas largas e estreitas', () => {
  const mockMatchMedia = (matches: boolean) =>
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (q: string) => ({ matches, media: q, addEventListener: jest.fn(), removeEventListener: jest.fn() }),
    });
  afterEach(() => {
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  });

  it('tela larga: detalhes e mapa lado a lado, sem abas', async () => {
    mockMatchMedia(false);
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    await screen.findByRole('heading', { name: 'Pedido PED-001' });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(await screen.findByRole('region', { name: /Mapa com origem/ })).toBeVisible();
  });

  describe('estreita (abas)', () => {
    beforeEach(() => mockMatchMedia(true));

    const abrirPedido = async () => {
      responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
      renderComQuery(<App />);
      await buscar();
      await screen.findByRole('heading', { name: 'Pedido PED-001' });
    };

    it('mostra Detalhes por padrão, com o mapa montado porém oculto', async () => {
      await abrirPedido();
      const abaDetalhes = screen.getByRole('tab', { name: 'Detalhes' });
      expect(abaDetalhes).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Mapa' })).toHaveAttribute('aria-selected', 'false');
      const painelMapa = document.getElementById('painel-mapa') as HTMLElement;
      expect(painelMapa).toHaveAttribute('role', 'tabpanel');
      expect(painelMapa).toHaveAttribute('aria-labelledby', 'aba-mapa');
      expect(painelMapa).not.toBeVisible();
      await waitFor(() => expect(fake.mapsCreated).toBe(1));
    });

    it('trocar para Mapa mostra o mapa, esconde os detalhes e recalcula o tamanho do Leaflet', async () => {
      await abrirPedido();
      await waitFor(() => expect(fake.mapsCreated).toBe(1));
      const antes = fake.invalidated;
      await userEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
      expect(document.getElementById('painel-mapa')).toBeVisible();
      expect(document.getElementById('painel-detalhes')).not.toBeVisible();
      expect(fake.invalidated).toBeGreaterThan(antes);
      expect(fake.mapsCreated).toBe(1);
      expect(fake.mapsRemoved).toBe(0);
    });

    it('setas, Home e End movem a seleção e o foco (foco itinerante)', async () => {
      await abrirPedido();
      const detalhes = screen.getByRole('tab', { name: 'Detalhes' });
      const mapa = screen.getByRole('tab', { name: 'Mapa' });
      expect(detalhes).toHaveAttribute('tabindex', '0');
      expect(mapa).toHaveAttribute('tabindex', '-1');
      detalhes.focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(mapa).toHaveAttribute('aria-selected', 'true');
      expect(mapa).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}');
      expect(detalhes).toHaveAttribute('aria-selected', 'true');
      await userEvent.keyboard('{End}');
      expect(mapa).toHaveFocus();
      await userEvent.keyboard('{Home}');
      expect(detalhes).toHaveFocus();
    });

    it('uma nova busca volta para a aba Detalhes', async () => {
      await abrirPedido();
      await userEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
      await userEvent.clear(screen.getByLabelText('Número do pedido'));
      await userEvent.type(screen.getByLabelText('Número do pedido'), 'PED-001{Enter}');
      expect(screen.getByRole('tab', { name: 'Detalhes' })).toHaveAttribute('aria-selected', 'true');
    });

    it('não tem violações do axe com as abas', async () => {
      await abrirPedido();
      expect(await axe(document.body)).toHaveNoViolations();
      await userEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
      expect(await axe(document.body)).toHaveNoViolations();
    });
  });
});

describe('App: pedido na URL', () => {
  it('buscar grava ?pedido= e a marca RotaLog volta para a tela inicial', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    await screen.findByRole('heading', { name: 'Pedido PED-001' });
    expect(window.location.search).toBe('?pedido=PED-001');

    await userEvent.click(screen.getByRole('link', { name: /RotaLog/ }));
    expect(await screen.findByRole('heading', { name: 'Acompanhe sua entrega' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('abrir a URL com ?pedido= já consulta o pedido, sem passar pela tela inicial', async () => {
    window.history.replaceState(null, '', '/?pedido=PED-001');
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    expect(await screen.findByRole('heading', { name: 'Pedido PED-001' })).toBeInTheDocument();
    expect(urls()).toEqual([`${base}/api/rastreamento/pedido/PED-001`]);
  });

  it('valor inválido na URL (vazio ou acima de 50 caracteres) é ignorado', () => {
    window.history.replaceState(null, '', '/?pedido=' + 'X'.repeat(51));
    renderComQuery(<App />);
    expect(screen.getByRole('heading', { name: 'Acompanhe sua entrega' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('voltar do navegador troca o pedido consultado', async () => {
    responder({
      '/api/rastreamento/pedido/A': () => jsonResponse(pedido({ pedido: 'A' })),
      '/api/rastreamento/pedido/B': () => jsonResponse(pedido({ pedido: 'B' })),
    });
    renderComQuery(<App />);
    await buscar('A');
    await screen.findByRole('heading', { name: 'Pedido A' });
    await userEvent.clear(screen.getByLabelText('Número do pedido'));
    await userEvent.type(screen.getByLabelText('Número do pedido'), 'B{Enter}');
    await screen.findByRole('heading', { name: 'Pedido B' });

    act(() => window.history.back());
    await waitFor(() => expect(window.location.search).toBe('?pedido=A'));
    expect(await screen.findByRole('heading', { name: 'Pedido A' })).toBeInTheDocument();
    expect(screen.getByLabelText('Número do pedido')).toHaveValue('A');
  });
});

describe('App: polling', () => {
  it('só consulta depois da busca e usa a resposta para atualizar a tela', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    let status = 'EM_TRANSITO';
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido({ status })) });
    renderComQuery(<App />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(6000);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await buscar();
    await waitFor(() => expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Em Trânsito'));
    status = 'ENTREGUE';
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5100);
    });
    await waitFor(() => expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Entregue'));
  });
});

describe('App: mapa e segurança', () => {
  it('popups mostram o payload como texto literal, sem elementos injetados (origem, destino e descrição)', async () => {
    responder({
      '/api/rastreamento/pedido/PED-001': () =>
        jsonResponse(pedido({ origem: XSS, destino: XSS, eventos: [evento({ descricao: XSS })] })),
    });
    renderComQuery(<App />);
    await buscar();
    await waitFor(() => expect(fake.popups.length).toBe(3));
    (fake.popups as HTMLElement[]).forEach((p) => {
      expect(p).toBeInstanceOf(HTMLElement);
      expect(p.querySelector('img')).toBeNull();
    });
    expect((fake.popups as HTMLElement[]).map((p) => p.textContent).join('|')).toContain(XSS);
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('cria o mapa uma vez, limpa as linhas ao trocar de pedido e remove no desmonte', async () => {
    const dois = [evento({ id: 1 }), evento({ id: 2, latitude: '-23.57', data_evento: '2026-11-01T11:00:00.000Z' })];
    responder({
      '/api/rastreamento/pedido/A': () => jsonResponse(pedido({ pedido: 'A', eventos: dois })),
      '/api/rastreamento/pedido/B': () => jsonResponse(pedido({ pedido: 'B', eventos: [] })),
    });
    const { unmount } = renderComQuery(<App />);
    await buscar('A');
    await waitFor(() => expect(fake.polylines.length).toBeGreaterThan(0));
    await userEvent.clear(screen.getByLabelText('Número do pedido'));
    await buscar('B');
    await screen.findByRole('heading', { name: 'Pedido B' });
    expect(fake.mapsCreated).toBe(1);
    unmount();
    expect(fake.mapsRemoved).toBe(1);
  });

  it('marcadores são SVG estáticos com formas e classes por tipo, sem emoji nem dado da API', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido({ origem: XSS })) });
    renderComQuery(<App />);
    await buscar();
    await waitFor(() => expect(fake.icons.length).toBe(3));
    const classes = fake.icons.map((i) => String(i.className));
    expect(classes.some((c) => c.includes('rt-marker-origem'))).toBe(true);
    expect(classes.some((c) => c.includes('rt-marker-destino'))).toBe(true);
    expect(classes.some((c) => c.includes('rt-marker-posicao-atual'))).toBe(true);
    fake.icons.forEach((i) => {
      const html = String(i.html);
      expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(html).not.toContain(XSS);
      expect(html).not.toContain('onerror');
    });
    expect(fake.icons.filter((i) => String(i.html).includes('<svg')).length).toBeGreaterThanOrEqual(2);
  });

  it('popups têm títulos em texto (Origem, Destino, Posição atual) e a legenda é decorativa', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    await waitFor(() => expect(fake.popups.length).toBe(3));
    const titulos = (fake.popups as HTMLElement[]).map((p) => p.querySelector('strong')?.textContent);
    expect(titulos).toEqual(expect.arrayContaining(['Origem', 'Destino', 'Posição atual']));
    const legenda = document.querySelector('ul[aria-hidden="true"]');
    expect(legenda).toHaveTextContent('Percorrido');
  });

  it('mostra o resumo textual do mapa fora do popup', async () => {
    responder({ '/api/rastreamento/pedido/PED-001': () => jsonResponse(pedido()) });
    renderComQuery(<App />);
    await buscar();
    expect(await screen.findByText(/Última posição:/)).toBeInTheDocument();
    expect(screen.getByText(/Posições registradas: 1/)).toBeInTheDocument();
  });
});
