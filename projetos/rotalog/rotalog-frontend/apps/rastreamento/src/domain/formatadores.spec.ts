import { formatarHora, formatarRecencia } from './formatadores';
import { configDoEvento, configDoStatus, ETAPAS, STATUS_CONFIG } from './status';

describe('formatarRecencia', () => {
  const agora = new Date('2026-11-09T12:00:00Z').getTime();
  it.each([
    ['2026-11-09T11:59:40Z', 'agora há pouco'],
    ['2026-11-09T11:55:00Z', 'há 5 min'],
    ['2026-11-09T09:00:00Z', 'há 3 h'],
  ])('%s vira "%s"', (iso, esperado) => expect(formatarRecencia(iso, agora)).toBe(esperado));

  it('com 24 h ou mais (ou data futura/ inválida) usa a data completa, que não muda com o tempo', () => {
    const completa = formatarRecencia('2026-11-01T10:30:00Z', agora);
    expect(completa).toMatch(/^\d{2}\/\d{2}/);
    expect(formatarRecencia('2026-11-01T10:30:00Z', agora + 86_400_000 * 30)).toBe(completa);
    expect(formatarRecencia('2026-11-10T10:30:00Z', agora)).toMatch(/^\d{2}\/\d{2}/);
  });

  it('formatarHora devolve HH:MM', () => expect(formatarHora(agora)).toMatch(/^\d{2}:\d{2}$/));
});

describe('status e eventos', () => {
  it('as 4 etapas seguem a ordem do fluxo e batem com o índice de cada status', () => {
    expect(ETAPAS.map((e) => STATUS_CONFIG[e].etapa)).toEqual([0, 1, 2, 3]);
    expect(configDoStatus('CANCELADA').etapa).toBeNull();
    expect(configDoStatus('???').etapa).toBeNull();
  });

  it('evento conhecido tem rótulo pt-BR; desconhecido usa o texto cru e ícone neutro', () => {
    expect(configDoEvento('ENTREGA_CANCELADA')).toEqual({ rotulo: 'Entrega cancelada', icone: 'cancelada' });
    expect(configDoEvento('ALGO_NOVO')).toEqual({ rotulo: 'ALGO NOVO', icone: 'relogio' });
  });
});
