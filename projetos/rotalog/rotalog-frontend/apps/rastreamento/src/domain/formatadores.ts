const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** Data e hora completas, no fuso do navegador. */
export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * Tempo relativo só para eventos recentes (menos de 24 h); depois disso, a data
 * completa. Assim textos antigos não mudam a cada dia.
 */
export function formatarRecencia(iso: string, agora: number = Date.now()): string {
  const diferenca = agora - new Date(iso).getTime();
  if (!Number.isFinite(diferenca) || diferenca < 0 || diferenca >= DIA) return formatarDataHora(iso);
  if (diferenca < MINUTO) return 'agora há pouco';
  if (diferenca < HORA) return `há ${Math.floor(diferenca / MINUTO)} min`;
  return `há ${Math.floor(diferenca / HORA)} h`;
}

export function formatarHora(instante: number): string {
  return new Date(instante).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
