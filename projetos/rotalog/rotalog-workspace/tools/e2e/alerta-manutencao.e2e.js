#!/usr/bin/env node
// E2E do fluxo de alerta de manutenção preventiva (frotas -> notificações, HTTP síncrono).
// Pré-requisito: banco recém-criado (docker-compose down -v && up -d postgres) e api-frotas no ar.
// Node 18+ (fetch nativo). Uso:
//   node alerta-manutencao.e2e.js feliz        # frotas + notificações no ar
//   node alerta-manutencao.e2e.js fora         # notificações PARADA: alertas devem ficar PENDENTE
//   node alerta-manutencao.e2e.js recuperar    # notificações de volta: reprocessar -> ENVIADO
// Cenário de falha completo: banco novo -> (parar notificações) fora -> (subir notificações) recuperar.

const FROTAS = process.env.API_FROTAS_URL || 'http://localhost:8080/api';
const NOTIF = process.env.API_NOTIFICACOES_URL || 'http://localhost:5000/api';
const VEICULO_ELEGIVEL = 5; // Renault Master: 15000 km, sem histórico, sem alerta no seed

let falhas = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`);
  if (!ok) falhas++;
};

async function http(method, url) {
  const res = await fetch(url, { method, signal: AbortSignal.timeout(30000) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const alertasDoVeiculo = async (id) =>
  (await http('GET', `${FROTAS}/alertas-manutencao?veiculoId=${id}`)).body;

async function feliz() {
  const v = await http('POST', `${FROTAS}/alertas-manutencao/verificar`);
  check(v.status === 200 && v.body.criados >= 1, `verificar cria alertas (criados=${v.body && v.body.criados})`);

  const [alerta] = await alertasDoVeiculo(VEICULO_ELEGIVEL);
  check(!!alerta, `alerta registrado no banco para o veículo ${VEICULO_ELEGIVEL}`);
  check(alerta && alerta.statusNotificacao === 'ENVIADO', `status do alerta = ENVIADO (${alerta && alerta.statusNotificacao})`);
  check(alerta && alerta.notificacaoId != null, 'alerta guarda notificacaoId');

  if (alerta && alerta.notificacaoId != null) {
    const n = await http('GET', `${NOTIF}/notificacoes/${alerta.notificacaoId}`);
    check(n.status === 200 && n.body.tipo === 'MANUTENCAO_PREVENTIVA', 'notificação MANUTENCAO_PREVENTIVA existe na api-notificacoes');
    check(n.body && /enviad/i.test(String(n.body.status)), `notificação com status enviado (${n.body && n.body.status})`);
  }

  const v2 = await http('POST', `${FROTAS}/alertas-manutencao/verificar`);
  check(v2.body.criados === 0, 'segunda verificação não duplica alertas');

  const filtro = await http('GET', `${FROTAS}/alertas-manutencao?status=ENVIADO`);
  check(filtro.status === 200 && filtro.body.every((a) => a.statusNotificacao === 'ENVIADO'), 'filtro por status funciona');
}

async function fora() {
  const v = await http('POST', `${FROTAS}/alertas-manutencao/verificar`);
  check(v.status === 200, 'verificar responde 200 mesmo com notificações fora');
  const [alerta] = await alertasDoVeiculo(VEICULO_ELEGIVEL);
  check(alerta && alerta.statusNotificacao === 'PENDENTE', `alerta registrado como PENDENTE (${alerta && alerta.statusNotificacao})`);
}

async function recuperar() {
  const r = await http('POST', `${FROTAS}/alertas-manutencao/reprocessar`);
  check(r.status === 200 && r.body.enviados >= 1, `reprocessar envia pendentes (enviados=${r.body && r.body.enviados})`);
  const [alerta] = await alertasDoVeiculo(VEICULO_ELEGIVEL);
  check(alerta && alerta.statusNotificacao === 'ENVIADO', `alerta passou para ENVIADO (${alerta && alerta.statusNotificacao})`);
  const pend = await http('GET', `${FROTAS}/alertas-manutencao?status=PENDENTE`);
  check(pend.body.length === 0, 'nenhum alerta PENDENTE restante');
}

const fases = { feliz, fora, recuperar };
const fase = process.argv[2];
if (!fases[fase]) {
  console.error('Uso: node alerta-manutencao.e2e.js feliz|fora|recuperar');
  process.exit(2);
}
fases[fase]()
  .catch((e) => check(false, `erro inesperado: ${e.message}`))
  .finally(() => {
    console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTudo certo');
    process.exit(falhas ? 1 : 0);
  });
