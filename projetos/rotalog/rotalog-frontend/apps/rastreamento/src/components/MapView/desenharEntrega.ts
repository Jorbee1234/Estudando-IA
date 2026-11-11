import L from 'leaflet';
import { posicoesDaEntrega } from '../../domain/mappers';
import { StatusEntrega } from '../../domain/status';
import type { Entrega } from '../../domain/tipos';
import { criarPopup, htmlMarcador } from './popup';
import type { TipoMarcador } from './popup';

const COR_PERCORRIDO = '#0b6b4c';
const COR_RESTANTE = '#52606d';

function icone(classe: string, tipo: TipoMarcador, tamanho: number) {
  return L.divIcon({
    className: `rt-custom-marker ${classe}`,
    html: htmlMarcador(tipo),
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
    popupAnchor: [0, -tamanho / 2],
  });
}

/**
 * Desenha a entrega dentro de `grupo` (marcadores e linhas). Tudo vive no grupo,
 * então `grupo.clearLayers()` remove tudo e nada acumula entre atualizações.
 * Marcadores têm `keyboard`, `title` e `alt`; popups são nós DOM.
 */
export function desenharEntrega(mapa: L.Map, grupo: L.LayerGroup, entrega: Entrega): void {
  grupo.clearLayers();

  const origem = entrega.origem_lat !== null && entrega.origem_lng !== null ? L.latLng(entrega.origem_lat, entrega.origem_lng) : null;
  const destino = entrega.destino_lat !== null && entrega.destino_lng !== null ? L.latLng(entrega.destino_lat, entrega.destino_lng) : null;

  if (origem) {
    grupo.addLayer(
      L.marker(origem, {
        icon: icone('rt-marker-origem', 'origem', 32),
        title: 'Origem',
        alt: 'Origem da entrega',
        keyboard: true,
      }).bindPopup(criarPopup('Origem', 'rt-popup-titulo-origem', [{ texto: entrega.origem_endereco }])),
    );
  }

  if (destino) {
    grupo.addLayer(
      L.marker(destino, {
        icon: icone('rt-marker-destino', 'destino', 32),
        title: 'Destino',
        alt: 'Destino da entrega',
        keyboard: true,
      }).bindPopup(criarPopup('Destino', 'rt-popup-titulo-destino', [{ texto: entrega.destino_endereco }])),
    );
  }

  const posicoes = entrega.status === StatusEntrega.EM_TRANSITO ? posicoesDaEntrega(entrega) : [];

  posicoes.forEach((pos, idx) => {
    const atual = idx === posicoes.length - 1;
    grupo.addLayer(
      L.marker([pos.latitude, pos.longitude], {
        icon: atual ? icone('rt-marker-posicao-atual', 'veiculo', 34) : icone('rt-marker-posicao', 'posicao', 12),
        title: atual ? 'Posição atual' : 'Posição anterior',
        alt: atual ? 'Posição atual da entrega' : 'Posição anterior da entrega',
        keyboard: true,
      }).bindPopup(
        criarPopup(atual ? 'Posição atual' : 'Posição', 'rt-popup-titulo', [
          { texto: pos.descricao ?? '' },
          { texto: new Date(pos.data_evento).toLocaleString('pt-BR'), classe: 'rt-popup-data' },
        ]),
      ),
    );
  });

  if (posicoes.length > 0) {
    const percorrido: L.LatLng[] = [];
    if (origem) percorrido.push(origem);
    posicoes.forEach((p) => percorrido.push(L.latLng(p.latitude, p.longitude)));

    if (percorrido.length > 1) {
      grupo.addLayer(L.polyline(percorrido, { color: COR_PERCORRIDO, weight: 5, opacity: 0.9 }));
    }
    const ultimo = percorrido[percorrido.length - 1];
    if (destino && ultimo) {
      grupo.addLayer(
        L.polyline([ultimo, destino], { color: COR_RESTANTE, weight: 3, opacity: 0.75, dashArray: '6, 8' }),
      );
      mapa.fitBounds(L.latLngBounds([...percorrido, destino]), { padding: [50, 50] });
    }
    return;
  }

  if (origem && destino) {
    grupo.addLayer(L.polyline([origem, destino], { color: COR_RESTANTE, weight: 3, opacity: 0.75, dashArray: '6, 8' }));
    mapa.fitBounds(L.latLngBounds(origem, destino), { padding: [50, 50] });
  } else if (origem || destino) {
    mapa.setView((origem ?? destino) as L.LatLng, 15);
  }
}
