import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordenada, Entrega } from '../../domain/tipos';
import { desenharEntrega } from './desenharEntrega';
import { LegendaMapa } from './LegendaMapa';
import { ResumoMapa } from './ResumoMapa';
import estilos from './MapView.module.css';

interface Props {
  centro: Coordenada;
  zoom: number;
  entrega: Entrega | null;
  /** `false` quando o contêiner está oculto (aba "Detalhes" no celular). */
  visivel?: boolean;
}

export default function MapView({ centro, zoom, entrega, visivel = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const grupoRef = useRef<L.LayerGroup | null>(null);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState(false);
  const inicial = useRef({ centro, zoom });

  // Sincroniza com um sistema externo (Leaflet): cria uma vez e remove no cleanup.
  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const { centro: c, zoom: z } = inicial.current;
      const mapa = L.map(containerRef.current, { center: [c.lat, c.lng], zoom: z, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapa);
      grupoRef.current = L.layerGroup().addTo(mapa);
      mapaRef.current = mapa;
      setPronto(true);
    } catch {
      setErro(true);
    }
    return () => {
      mapaRef.current?.remove();
      mapaRef.current = null;
      grupoRef.current = null;
      setPronto(false);
    };
  }, []);

  useEffect(() => {
    if (!pronto || !visivel || !mapaRef.current || !grupoRef.current) return;
    // Leaflet mede o contêiner: depois de oculto, recalcula o tamanho antes de redesenhar e ajustar o zoom.
    mapaRef.current.invalidateSize();
    if (entrega) desenharEntrega(mapaRef.current, grupoRef.current, entrega);
    else grupoRef.current.clearLayers();
  }, [pronto, entrega, visivel]);

  const centralizar = () => {
    const origem = entrega && entrega.origem_lat !== null && entrega.origem_lng !== null ? entrega : null;
    if (origem) mapaRef.current?.setView([origem.origem_lat as number, origem.origem_lng as number], 14);
    else mapaRef.current?.setView([inicial.current.centro.lat, inicial.current.centro.lng], inicial.current.zoom);
  };

  return (
    <div className={estilos.mapa}>
      <div className={estilos.cabecalho}>
        <h2 className={estilos.titulo}>Mapa de Rastreamento</h2>
        <div className={estilos.acoes}>
          {entrega && (
            <span className={estilos.info}>
              Pedido {entrega.numero_pedido}
            </span>
          )}
          <button type="button" className={estilos.botao} onClick={centralizar}>
            Centralizar
          </button>
        </div>
      </div>

      <div className={estilos.container}>
        {erro && (
          <div className={estilos.erro} role="alert">
            <p>Erro ao carregar o mapa</p>
            <p className={estilos.dica}>Verifique sua conexão com a internet</p>
          </div>
        )}
        <div
          ref={containerRef}
          className={estilos.leaflet}
          role="region"
          aria-label="Mapa com origem, destino e posições da entrega"
        />
        {entrega && <LegendaMapa />}
        {!pronto && !erro && (
          <div className={estilos.carregando} role="status">
            Carregando mapa...
          </div>
        )}
      </div>
      <ResumoMapa entrega={entrega} />
    </div>
  );
}
