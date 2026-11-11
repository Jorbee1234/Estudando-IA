import {
  Entrega,
  Manutencao,
  Motorista,
  StatusEntrega,
  StatusManutencao,
  StatusMotorista,
  StatusVeiculo,
  Veiculo,
} from '../../core/models';
import { infoDoStatus } from '../../shared/constants/status-config';
import { DadoGrafico } from '../../shared/ui/charts/dado-grafico';

// Regras do dashboard (ADR 0003, D4). Tudo puro e testável: recebe os dados e o "hoje".
// Só entram regras que os campos das APIs sustentam. "Entrega atrasada" e "manutenção parada
// há muito tempo" ficam de fora: não há regra de negócio nem a data de início/entrada.

export type Severidade = 'danger' | 'warning' | 'info';

export interface Alerta {
  id: string;
  tipo: Severidade;
  mensagem: string;
  /** Data que motivou o alerta, já formatada (dd/mm/aaaa), ou null. */
  data: string | null;
  /** Para onde o alerta leva (usa o estado na URL das listas). */
  rota: string;
  params: Record<string, string>;
}

/** Janela em dias para avisar de CNH a vencer. */
export const DIAS_AVISO_CNH = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

/** Lê "aaaa-mm-dd" (ou ISO com hora) como data LOCAL à meia-noite; evita o deslocamento de fuso. */
export function lerData(texto: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto ?? '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Rejeita datas que o Date "corrige" (2026-02-31 viraria março).
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])
    ? d
    : null;
}

export function formatarData(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diasAte = (alvo: Date, hoje: Date) => Math.round((alvo.getTime() - meiaNoite(hoje).getTime()) / DIA_MS);
/** "1 ativo" / "2 ativos": o número já vai junto. */
export const pluralizar = (n: number, singular: string, plural_: string) => `${n} ${n === 1 ? singular : plural_}`;

function prazo(dias: number): string {
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `vence em ${dias} dias`;
}

const ORDEM: Record<Severidade, number> = { danger: 0, warning: 1, info: 2 };

export function calcularAlertas(
  motoristas: readonly Motorista[],
  manutencoes: readonly Manutencao[],
  veiculos: readonly Veiculo[],
  hoje: Date
): Alerta[] {
  // Cada alerta leva a chave de ordenação ao lado (data em ms), sem poluir o tipo público.
  const itens: { alerta: Alerta; ordem: number }[] = [];

  // CNH: motorista inativo não dirige, então o vencimento dele não é alerta.
  for (const m of motoristas) {
    if (m.status === StatusMotorista.INATIVO) continue;
    const venc = lerData(m.validade_cnh);
    if (!venc) continue;
    const dias = diasAte(venc, hoje);
    if (dias > DIAS_AVISO_CNH) continue;
    const vencida = dias < 0;
    itens.push({
      ordem: venc.getTime(),
      alerta: {
        id: `cnh-${m.id}`,
        tipo: vencida ? 'danger' : 'warning',
        mensagem: vencida
          ? `CNH de ${m.nome} venceu em ${formatarData(venc)}`
          : `CNH de ${m.nome} ${prazo(dias)}`,
        data: formatarData(venc),
        rota: '/motoristas',
        params: { q: m.nome },
      },
    });
  }

  // Manutenção pendente cuja data agendada já passou.
  const placaDe = new Map(veiculos.map((v) => [v.id, v.placa]));
  for (const mt of manutencoes) {
    if (mt.status !== StatusManutencao.PENDENTE) continue;
    const agendada = lerData(mt.data_agendada);
    if (!agendada || diasAte(agendada, hoje) >= 0) continue;
    itens.push({
      ordem: agendada.getTime(),
      alerta: {
        id: `manutencao-${mt.id}`,
        tipo: 'warning',
        mensagem: `Manutenção do veículo ${placaDe.get(mt.veiculo_id) ?? `#${mt.veiculo_id}`} atrasada (agendada para ${formatarData(agendada)})`,
        data: formatarData(agendada),
        rota: '/manutencoes',
        params: {},
      },
    });
  }

  // Disponibilidade da frota: informativo, sem prazo.
  const emManutencao = veiculos.filter((v) => v.status === StatusVeiculo.MANUTENCAO).length;
  const inativos = veiculos.filter((v) => v.status === StatusVeiculo.INATIVO).length;
  if (emManutencao > 0) {
    itens.push({
      ordem: 0,
      alerta: {
        id: 'frota-manutencao',
        tipo: 'info',
        mensagem: pluralizar(emManutencao, 'veículo em manutenção', 'veículos em manutenção'),
        data: null,
        rota: '/veiculos',
        params: { status: StatusVeiculo.MANUTENCAO },
      },
    });
  }
  if (inativos > 0) {
    itens.push({
      ordem: 1,
      alerta: {
        id: 'frota-inativos',
        tipo: 'info',
        mensagem: pluralizar(inativos, 'veículo inativo', 'veículos inativos'),
        data: null,
        rota: '/veiculos',
        params: { status: StatusVeiculo.INATIVO },
      },
    });
  }

  return itens
    .sort((a, b) => ORDEM[a.alerta.tipo] - ORDEM[b.alerta.tipo] || a.ordem - b.ordem)
    .map((i) => i.alerta);
}

/** CNH vencidas ou a vencer na janela: o mesmo critério dos alertas de CNH. */
export function contarCnhEmAtencao(alertas: readonly Alerta[]): number {
  return alertas.filter((a) => a.id.startsWith('cnh-')).length;
}

export function contarManutencoesAtrasadas(alertas: readonly Alerta[]): number {
  return alertas.filter((a) => a.id.startsWith('manutencao-')).length;
}

const COR_VEICULO: Record<string, string> = {
  [StatusVeiculo.ATIVO]: 'var(--grafico-3)',
  [StatusVeiculo.MANUTENCAO]: 'var(--grafico-2)',
  [StatusVeiculo.INATIVO]: 'var(--grafico-sem-dado)',
};

/** Frota por situação, para a rosca. Mantém a ordem fixa e omite situações sem veículos. */
export function frotaPorSituacao(veiculos: readonly Veiculo[]): DadoGrafico[] {
  return [StatusVeiculo.ATIVO, StatusVeiculo.MANUTENCAO, StatusVeiculo.INATIVO]
    .map((s) => ({
      rotulo: infoDoStatus('veiculo', s).rotulo,
      valor: veiculos.filter((v) => v.status === s).length,
      cor: COR_VEICULO[s],
    }))
    .filter((d) => d.valor > 0);
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Manutenções por mês da data agendada, os `max` meses mais recentes, em ordem cronológica. */
export function manutencoesPorMes(manutencoes: readonly Manutencao[], max = 6): DadoGrafico[] {
  const porMes = new Map<string, number>();
  for (const m of manutencoes) {
    const d = lerData(m.data_agendada);
    if (!d) continue;
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    porMes.set(chave, (porMes.get(chave) ?? 0) + 1);
  }
  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-max)
    .map(([chave, valor]) => {
      const [ano, mes] = chave.split('-');
      return { rotulo: `${MESES[Number(mes) - 1]}/${ano}`, valor, cor: 'var(--grafico-1)' };
    });
}

const COR_ENTREGA: Record<string, string> = {
  [StatusEntrega.PENDENTE]: 'var(--grafico-5)',
  [StatusEntrega.ATRIBUIDA]: 'var(--grafico-4)',
  [StatusEntrega.EM_TRANSITO]: 'var(--grafico-1)',
  [StatusEntrega.ENTREGUE]: 'var(--grafico-3)',
  [StatusEntrega.CANCELADA]: 'var(--grafico-sem-dado)',
};

/** Entregas por status, na ordem do ciclo de vida, omitindo status sem entregas. */
export function entregasPorStatus(entregas: readonly Entrega[]): DadoGrafico[] {
  return [
    StatusEntrega.PENDENTE,
    StatusEntrega.ATRIBUIDA,
    StatusEntrega.EM_TRANSITO,
    StatusEntrega.ENTREGUE,
    StatusEntrega.CANCELADA,
  ]
    .map((s) => ({
      rotulo: infoDoStatus('entrega', s).rotulo,
      valor: entregas.filter((e) => e.status === s).length,
      cor: COR_ENTREGA[s],
    }))
    .filter((d) => d.valor > 0);
}
