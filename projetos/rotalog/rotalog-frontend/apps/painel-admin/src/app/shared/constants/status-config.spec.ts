import {
  StatusAlertaManutencao,
  StatusEntrega,
  StatusManutencao,
  StatusMotorista,
  StatusVeiculo,
} from '../../core/models';
import { StatusLabelPipe } from '../pipes/status-label.pipe';
import { infoDoStatus, STATUS_CONFIG } from './status-config';

describe('STATUS_CONFIG', () => {
  it('cobre todos os valores de cada enum', () => {
    const casos: [keyof typeof STATUS_CONFIG, string[]][] = [
      ['veiculo', Object.values(StatusVeiculo)],
      ['motorista', Object.values(StatusMotorista)],
      ['manutencao', Object.values(StatusManutencao)],
      ['entrega', Object.values(StatusEntrega)],
      ['alertaManutencao', Object.values(StatusAlertaManutencao)],
    ];
    for (const [dominio, valores] of casos) {
      expect(Object.keys(STATUS_CONFIG[dominio]).sort()).toEqual(
        [...valores].sort()
      );
    }
  });

  it('MANUTENCAO aparece como "Em manutenção", nunca o texto cru', () => {
    expect(infoDoStatus('veiculo', 'MANUTENCAO').rotulo).toBe('Em manutenção');
  });

  it('alerta de manutenção: PENDENTE=alerta, ENVIADO=sucesso, FALHA=perigo', () => {
    expect(infoDoStatus('alertaManutencao', 'PENDENTE').tom).toBe('alerta');
    expect(infoDoStatus('alertaManutencao', 'ENVIADO').tom).toBe('sucesso');
    expect(infoDoStatus('alertaManutencao', 'FALHA').tom).toBe('perigo');
  });

  it('é tolerante a caixa e espaços', () => {
    expect(infoDoStatus('entrega', ' em_transito ').rotulo).toBe('Em trânsito');
  });

  it('status desconhecido mostra o texto cru com tom neutro', () => {
    expect(infoDoStatus('veiculo', 'BAIXADO')).toMatchObject({
      rotulo: 'BAIXADO',
      tom: 'neutro',
    });
    expect(infoDoStatus('veiculo', null).rotulo).toBe('Desconhecido');
  });

  it('todo status tem rótulo, tom e ícone', () => {
    for (const dominio of Object.values(STATUS_CONFIG)) {
      for (const info of Object.values(dominio)) {
        expect(info.rotulo).toBeTruthy();
        expect(info.icone).toBeTruthy();
        expect(info.tom).not.toBe('neutro');
      }
    }
  });
});

describe('StatusLabelPipe', () => {
  it('devolve o rótulo pt-BR do domínio', () => {
    const pipe = new StatusLabelPipe();
    expect(pipe.transform('FERIAS', 'motorista')).toBe('Férias');
    expect(pipe.transform('CONCLUIDA', 'manutencao')).toBe('Concluída');
  });
});
