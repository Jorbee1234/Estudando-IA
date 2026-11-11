export interface LinhaPopup {
  texto: string;
  classe?: string;
}

/**
 * Monta o conteúdo de um popup do mapa só com nós DOM e `textContent`.
 * Nunca recebe nem devolve HTML: dados da API (endereço, descrição)
 * podem conter markup e jamais devem ser interpretados (ADR 0002, D5a).
 */
export function criarPopup(titulo: string, tituloClasse: string, linhas: LinhaPopup[]): HTMLElement {
  const raiz = document.createElement('div');
  raiz.className = 'rt-popup';

  const strong = document.createElement('strong');
  strong.className = tituloClasse;
  strong.textContent = titulo;
  raiz.appendChild(strong);

  linhas.forEach((linha) => {
    const span = document.createElement('span');
    span.className = `rt-popup-linha ${linha.classe ?? ''}`.trim();
    span.textContent = linha.texto;
    raiz.appendChild(span);
  });
  return raiz;
}

export type TipoMarcador = 'origem' | 'destino' | 'veiculo' | 'posicao';

const SVG = (corpo: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${corpo}</svg>`;

/**
 * HTML do ícone do marcador: **estático**, sem nenhum dado da API (ADR 0002, D5a).
 * Formas diferentes (círculo, quadrado arredondado, círculo com pulso, ponto) além da cor.
 */
const MARCADORES: Record<TipoMarcador, string> = {
  origem: `<div class="rt-marker-ponto rt-forma-circulo">${SVG('<path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>')}</div>`,
  destino: `<div class="rt-marker-ponto rt-forma-quadrado">${SVG('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>')}</div>`,
  veiculo: `<div class="rt-marker-ponto rt-forma-circulo"><span class="rt-pulso"></span>${SVG('<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>')}</div>`,
  posicao: '<div class="rt-marker-ponto rt-forma-circulo"></div>',
};

export function htmlMarcador(tipo: TipoMarcador): string {
  return MARCADORES[tipo];
}
