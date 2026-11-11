import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BuscaPedido } from '../components/BuscaPedido/BuscaPedido';
import { TelaInicial } from '../components/TelaInicial/TelaInicial';
import { TrackingDashboard } from '../components/TrackingDashboard/TrackingDashboard';
import { Abas, idAba, idPainel } from '../components/ui/Abas';
import type { IdAba } from '../components/ui/Abas';
import { Icon } from '../components/ui/icons/Icon';
import { ResultadoSkeleton } from '../components/ui/Skeleton';
import { StateMessage } from '../components/ui/StateMessage';
import { centroDaEntrega } from '../domain/mappers';
import type { Coordenada } from '../domain/tipos';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePedidoNaUrl } from '../hooks/usePedidoNaUrl';
import { useRastreamento } from '../hooks/useRastreamento';
import { ErrorBoundary } from './ErrorBoundary';
import estilos from './App.module.css';

// O mapa (Leaflet) fica fora do bundle inicial.
const MapView = lazy(() => import('../components/MapView/MapView'));

const CENTRO_PADRAO: Coordenada = { lat: -23.5505, lng: -46.6333 };
const ZOOM_PADRAO = 12;

export default function App() {
  const [numero, definirNumero] = usePedidoNaUrl();
  const painelRef = useRef<HTMLDivElement>(null);
  const focarAoBuscar = useRef(false);
  const estreita = useMediaQuery('(max-width: 1023px)');
  const [aba, setAba] = useState<IdAba>('detalhes');
  const mapaVisivel = !estreita || aba === 'mapa';

  const pedido = useRastreamento(numero);
  const entrega = pedido.data ?? null;
  const centro = (entrega && centroDaEntrega(entrega)) ?? CENTRO_PADRAO;

  const buscar = (valor: string) => {
    focarAoBuscar.current = true;
    setAba('detalhes');
    definirNumero(valor);
  };

  // Depois de uma busca feita pelo usuário, o foco vai para o painel de detalhes.
  useEffect(() => {
    if (numero && focarAoBuscar.current) {
      painelRef.current?.focus();
      focarAoBuscar.current = false;
    }
  }, [numero]);

  return (
    <div className={estilos.app}>
      <a className={estilos.pular} href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className={estilos.cabecalho}>
        <div className={estilos.cabecalhoInterno}>
          {numero === null ? (
            <span className={estilos.marca}>
              <Icon nome="pacote" tamanho={22} /> RotaLog
            </span>
          ) : (
            <a
              className={estilos.marca}
              href={window.location.pathname}
              onClick={(e) => {
                e.preventDefault();
                definirNumero(null);
              }}
            >
              <Icon nome="pacote" tamanho={22} /> RotaLog
            </a>
          )}
          {numero !== null && (
            <div className={estilos.busca}>
              <BuscaPedido variante="compacta" aoBuscar={buscar} valorInicial={numero} />
            </div>
          )}
        </div>
      </header>

      <main id="conteudo" className={estilos.principal}>
        {numero === null ? (
          <TelaInicial aoBuscar={buscar} />
        ) : (
          <>
            <h1 className="rt-sr-only">Rastreamento de entregas RotaLog</h1>
            <div className={estilos.resultado}>
              {estreita && <Abas ativa={aba} aoTrocar={setAba} />}
              <div
                ref={painelRef}
                tabIndex={-1}
                className={estilos.painel}
                hidden={!estreita ? false : aba !== 'detalhes'}
                {...(estreita ? { role: 'tabpanel', id: idPainel('detalhes'), 'aria-labelledby': idAba('detalhes') } : {})}
              >
                <ErrorBoundary regiao="os detalhes do pedido">
                  {pedido.isPending ? (
                    <ResultadoSkeleton />
                  ) : pedido.isError && !pedido.data ? (
                    <StateMessage
                      tipo="erro"
                      titulo="Não foi possível buscar o pedido"
                      mensagem={pedido.error.message}
                      aoTentarNovamente={() => void pedido.refetch()}
                    />
                  ) : entrega === null ? (
                    <StateMessage
                      tipo="vazio"
                      titulo="Não encontramos esse pedido"
                      mensagem={`Pedido ${numero} não encontrado. Confira o número no e-mail ou SMS da compra e tente de novo.`}
                    />
                  ) : (
                    <TrackingDashboard entrega={entrega} atualizadoEm={pedido.dataUpdatedAt} />
                  )}
                </ErrorBoundary>
              </div>

              <div
                className={estilos.mapa}
                hidden={!mapaVisivel}
                {...(estreita ? { role: 'tabpanel', id: idPainel('mapa'), 'aria-labelledby': idAba('mapa') } : {})}
              >
                <ErrorBoundary regiao="o mapa">
                  <Suspense fallback={<StateMessage tipo="carregando" mensagem="Carregando mapa..." />}>
                    <MapView centro={centro} zoom={ZOOM_PADRAO} entrega={entrega} visivel={mapaVisivel} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
