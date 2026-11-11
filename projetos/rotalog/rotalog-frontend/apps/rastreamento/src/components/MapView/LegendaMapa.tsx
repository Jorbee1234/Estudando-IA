import estilos from './MapView.module.css';

/**
 * Legenda visual do mapa. É decorativa para leitor de tela (`aria-hidden`): o mesmo
 * conteúdo está no `ResumoMapa`, em texto. Formas, não só cores, distinguem os itens.
 */
export function LegendaMapa() {
  return (
    <ul className={estilos.legenda} aria-hidden="true">
      <li>
        <span className={`${estilos.simbolo} ${estilos.origem}`} /> Origem
      </li>
      <li>
        <span className={`${estilos.simbolo} ${estilos.destino}`} /> Destino
      </li>
      <li>
        <span className={`${estilos.simbolo} ${estilos.veiculo}`} /> Veículo
      </li>
      <li>
        <span className={`${estilos.linha} ${estilos.percorrido}`} /> Percorrido
      </li>
      <li>
        <span className={`${estilos.linha} ${estilos.restante}`} /> Restante
      </li>
    </ul>
  );
}
