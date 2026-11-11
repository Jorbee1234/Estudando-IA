import { posicoesDaEntrega } from '../../domain/mappers';
import { configDoStatus } from '../../domain/status';
import type { Entrega } from '../../domain/tipos';
import estilos from './MapView.module.css';

/** Alternativa textual ao mapa: o mesmo conteúdo, fora do popup. */
export function ResumoMapa({ entrega }: { entrega: Entrega | null }) {
  if (!entrega) {
    return <p className={estilos.resumo}>Sem dados do pedido para mostrar no mapa.</p>;
  }
  const posicoes = posicoesDaEntrega(entrega);
  const ultima = posicoes[posicoes.length - 1];

  return (
    <details className={estilos.resumo}>
      <summary className={estilos.resumoTitulo}>Resumo do mapa em texto</summary>
      <ul className={estilos.resumoLista}>
        <li>Origem: {entrega.origem_endereco}</li>
        <li>Destino: {entrega.destino_endereco}</li>
        <li>Status: {configDoStatus(entrega.status).rotulo}</li>
        <li>
          Última posição:{' '}
          {ultima
            ? `${ultima.latitude}, ${ultima.longitude} (${new Date(ultima.data_evento).toLocaleString('pt-BR')})`
            : 'sem posição registrada'}
        </li>
        <li>Posições registradas: {posicoes.length}</li>
      </ul>
    </details>
  );
}
