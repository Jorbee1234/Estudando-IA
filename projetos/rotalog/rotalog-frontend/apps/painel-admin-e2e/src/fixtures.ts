import { Page } from '@playwright/test';

// Payloads no formato REAL das APIs (api-frotas em camelCase, api-entregas em snake_case).
// O e2e não precisa de Postgres nem das APIs no ar.
export const veiculos = [
  { id: 1, placa: 'ABC1D23', modelo: 'Volvo FH', anoFabricacao: 2021, quilometragem: 120000, status: 'ATIVO' },
  { id: 2, placa: 'XYZ9K88', modelo: 'Scania R450', anoFabricacao: 2019, quilometragem: 310500, status: 'MANUTENCAO' },
];
export const motoristas = [
  { id: 1, nome: 'Ana Souza', cnh: '12345678900', categoriaCnh: 'C', vencimentoCnh: '2000-01-01', status: 'ATIVO' },
  { id: 2, nome: 'Bruno Lima', cnh: '98765432100', categoriaCnh: 'D', vencimentoCnh: '2999-01-01', status: 'FERIAS' },
];
export const manutencoes = [
  { id: 1, veiculoId: 2, tipoManutencao: 'PREVENTIVA', dataManutencao: '2026-03-20', quilometragemManutencao: 310000, custo: 1500.5, descricao: 'Troca de óleo', status: 'PENDENTE' },
];
export const alertasManutencao = [
  { id: 1, veiculoId: 1, placa: 'ABC1D23', modelo: 'Volvo FH', tipoAlerta: 'KM', motivo: 'Mais de 10.000 km desde a última manutenção', kmAtual: 120000, kmBase: 100000, dataBase: '2026-01-10', statusNotificacao: 'ENVIADO', notificacaoId: 10, tentativas: 1, erro: null, dataCriacao: '2026-11-01T10:00:00', dataAtualizacao: '2026-11-01T10:00:02' },
  { id: 2, veiculoId: 2, placa: 'XYZ9K88', modelo: 'Scania R450', tipoAlerta: 'DATA', motivo: 'Última manutenção há mais de 6 meses', kmAtual: 310500, kmBase: 310000, dataBase: '2026-03-20', statusNotificacao: 'PENDENTE', notificacaoId: null, tentativas: 1, erro: 'Notificações indisponível', dataCriacao: '2026-11-02T09:00:00', dataAtualizacao: '2026-11-02T09:00:01' },
  { id: 3, veiculoId: 3, placa: 'DEF4G56', modelo: 'Mercedes Actros', tipoAlerta: 'KM', motivo: 'Mais de 10.000 km desde a última manutenção', kmAtual: 55000, kmBase: 40000, dataBase: '2026-02-01', statusNotificacao: 'FALHA', notificacaoId: 11, tentativas: 2, erro: 'SMTP recusou', dataCriacao: '2026-11-03T08:00:00', dataAtualizacao: '2026-11-03T08:00:05' },
];
export const entregas = [
  { id: '1', numero_pedido: 'PED-0001', status: 'EM_TRANSITO', origem_endereco: 'Rua A, 1', destino_endereco: 'Rua B, 2', motorista_nome: 'Ana Souza', veiculo_placa: 'ABC1D23', distancia_km: 12.5, tempo_estimado_minutos: 35 },
];

/** Volume grande (paginação): 57 veículos, 23 motoristas, 25 manutenções e 40 entregas. */
export function volumeGrande() {
  const placa = (i: number) => `AAA${String(i).padStart(4, '0')}`;
  return {
    veiculos: Array.from({ length: 57 }, (_, i) => ({
      id: i + 1,
      placa: placa(i + 1),
      modelo: i % 2 ? 'Scania R450' : 'Volvo FH',
      anoFabricacao: 2015 + (i % 10),
      quilometragem: 10000 * (i + 1),
      // 5º inativo (para o Reativar), 6º em manutenção, o resto ativo.
      status: i === 4 ? 'INATIVO' : i === 5 ? 'MANUTENCAO' : 'ATIVO',
    })),
    motoristas: Array.from({ length: 23 }, (_, i) => ({
      id: i + 1,
      nome: `Motorista ${String(i + 1).padStart(2, '0')}`,
      cnh: String(10000000000 + i),
      categoriaCnh: 'C',
      vencimentoCnh: '2031-01-01',
      status: i % 5 === 0 ? 'FERIAS' : 'ATIVO',
    })),
    manutencoes: Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      veiculoId: (i % 57) + 1,
      tipoManutencao: 'PREVENTIVA',
      dataManutencao: '2026-03-20',
      quilometragemManutencao: 1000 * (i + 1),
      custo: 100 + i,
      descricao: `Serviço ${i + 1}`,
      status: 'PENDENTE',
    })),
    entregas: Array.from({ length: 40 }, (_, i) => ({
      // BIGINT no Sequelize chega como texto numérico.
      id: String(i + 1),
      numero_pedido: `PED-${String(i + 1).padStart(4, '0')}`,
      status: i % 3 === 0 ? 'EM_TRANSITO' : 'ENTREGUE',
      origem_endereco: `Rua A, ${i + 1}`,
      destino_endereco: `Rua B, ${i + 1}`,
      motorista_nome: 'Ana Souza',
      veiculo_placa: placa((i % 57) + 1),
      distancia_km: 5 + i,
      tempo_estimado_minutos: 20 + i,
    })),
  };
}

/** Responde às APIs com fixtures; `apiForaDoAr` devolve 500, `carregando` nunca responde, `volume: 'grande'` gera listas longas e `dados` substitui listas. */
export async function mockApis(
  page: Page,
  opcoes: {
    apiForaDoAr?: boolean;
    carregando?: boolean;
    volume?: 'padrao' | 'grande';
    /** Substitui listas inteiras (ex.: motoristas com CNH em datas controladas). */
    dados?: Partial<{ veiculos: object[]; motoristas: object[]; manutencoes: object[]; entregas: object[]; alertasManutencao: object[] }>;
  } = {}
) {
  const padrao =
    opcoes.volume === 'grande' ? volumeGrande() : { veiculos, motoristas, manutencoes, entregas };
  const base = { ...padrao, ...opcoes.dados } as typeof padrao;
  const respostas: Record<string, unknown> = {
    '/api/veiculos': base.veiculos,
    '/api/motoristas': base.motoristas,
    '/api/manutencoes': base.manutencoes,
    '/api/entregas': base.entregas,
  };
  // Estado mutável: desativar/reativar um veículo muda o que o GET seguinte devolve.
  const veiculosAtuais = base.veiculos.map((v) => ({ ...v }));
  respostas['/api/veiculos'] = veiculosAtuais;
  // Alertas de manutenção: "verificar" cria um alerta ENVIADO; "reprocessar" envia os PENDENTE/FALHA.
  type Alerta = { id: number; statusNotificacao: string; tentativas: number; erro: string | null; [k: string]: unknown };
  const alertasAtuais = ((opcoes.dados?.alertasManutencao ?? alertasManutencao) as Alerta[]).map((a) => ({ ...a }));
  respostas['/api/alertas-manutencao'] = alertasAtuais;
  await page.route(/localhost:(8080|3000)\/api\//, async (route) => {
    // Nunca responde: a tela fica no estado de carregamento (para capturar o skeleton).
    if (opcoes.carregando) return new Promise<void>(() => undefined);
    if (opcoes.apiForaDoAr) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    }
    const { pathname } = new URL(route.request().url());
    const corpo = respostas[pathname];
    const mudanca = pathname.match(/^\/api\/veiculos\/(\d+)\/(desativar|reativar)$/);
    if (route.request().method() === 'PATCH' && mudanca) {
      const v = veiculosAtuais.find((x) => x.id === Number(mudanca[1]));
      if (!v) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      v.status = mudanca[2] === 'desativar' ? 'INATIVO' : 'ATIVO';
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) });
    }
    if (route.request().method() === 'POST' && pathname === '/api/alertas-manutencao/verificar') {
      const novo = { ...alertasManutencao[0], id: alertasAtuais.length + 1, placa: 'NEW1A11', statusNotificacao: 'ENVIADO', tentativas: 1, erro: null };
      alertasAtuais.push(novo);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ criados: 1, alertas: [novo] }) });
    }
    if (route.request().method() === 'POST' && pathname === '/api/alertas-manutencao/reprocessar') {
      const abertos = alertasAtuais.filter((a) => a.statusNotificacao !== 'ENVIADO');
      abertos.forEach((a) => {
        a.statusNotificacao = 'ENVIADO';
        a.tentativas += 1;
        a.erro = null;
      });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reprocessados: abertos.length, enviados: abertos.length }) });
    }
    if (route.request().method() === 'GET' && corpo) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}
