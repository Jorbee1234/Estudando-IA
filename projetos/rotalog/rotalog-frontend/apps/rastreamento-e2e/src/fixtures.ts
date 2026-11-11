import { expect, test as base, type Page } from '@playwright/test';

export const API = 'http://localhost:3000';

export const pedido = (o: Record<string, unknown> = {}) => ({
  pedido: 'PED-001',
  status: 'EM_TRANSITO',
  origem: 'Av. Paulista, 1000 - São Paulo',
  destino: 'Rua das Flores, 200 - Santo André',
  origem_lat: '-23.5614000',
  origem_lng: '-46.6559000',
  destino_lat: '-23.6639000',
  destino_lng: '-46.5383000',
  distancia_km: '18.40',
  tempo_estimado_minutos: 45,
  data_criacao: '2026-11-01T08:00:00.000Z',
  data_entrega: null,
  eventos: [
    { id: '3', evento: 'POSICAO_ATUALIZADA', descricao: 'Saindo de Moema', latitude: '-23.6000000', longitude: '-46.6200000', data_evento: '2026-11-01T10:30:00.000Z' },
    { id: '2', evento: 'STATUS_ALTERADO', descricao: 'Status alterado de ATRIBUIDA para EM_TRANSITO', latitude: null, longitude: null, data_evento: '2026-11-01T09:00:00.000Z' },
    { id: '1', evento: 'PEDIDO_CRIADO', descricao: 'Pedido de entrega criado: PED-001', latitude: null, longitude: null, data_evento: '2026-11-01T08:00:00.000Z' },
  ],
  ...o,
});

/** Tile cinza 256x256 gerado em tempo de execução: o mapa fica determinístico e sem rede. */
function tileCinza(): Buffer {
  // PNG 1x1 cinza; o navegador estica para o tamanho do tile.
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPYuXPnfwAIfAN7ZwVDlQAAAABJRU5ErkJggg==',
    'base64',
  );
}

export const test = base.extend<{ api: Page }>({
  api: async ({ page }, use) => {
    const tile = tileCinza();
    await page.route('**/*.tile.openstreetmap.org/**', (rota) => rota.fulfill({ status: 200, contentType: 'image/png', body: tile }));
    await use(page);
  },
});

export { expect };

export async function mockPedido(page: Page, numero: string, corpo: unknown, status = 200) {
  await page.route(`${API}/api/rastreamento/pedido/${numero}`, (rota) =>
    rota.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(corpo),
    }),
  );
}

export async function buscar(page: Page, numero: string) {
  await page.getByLabel('Número do pedido').fill(numero);
  await page.getByRole('button', { name: 'Rastrear' }).click();
}

export const LARGURAS = [
  { nome: 'mobile', width: 390, height: 844 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'desktop', width: 1280, height: 800 },
] as const;
