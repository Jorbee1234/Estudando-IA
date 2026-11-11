import { useState } from 'react';
import type { ReactNode } from 'react';
import { formatarHora } from '../../domain/formatadores';
import { formatarKm, formatarMinutos } from '../../domain/mappers';
import { configDoStatus } from '../../domain/status';
import type { NomeIcone } from '../../domain/icones';
import type { Entrega } from '../../domain/tipos';
import { Etapas } from '../ui/Etapas';
import { Icon } from '../ui/icons/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { Timeline } from '../ui/Timeline';
import estilos from './TrackingDashboard.module.css';

interface Props {
  entrega: Entrega;
  /** Instante (ms) da última atualização bem-sucedida; mostra "Atualizado às HH:MM". */
  atualizadoEm?: number;
}

export function TrackingDashboard({ entrega, atualizadoEm }: Props) {
  const [copiado, setCopiado] = useState(false);
  const cfg = configDoStatus(entrega.status);

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false); // sem permissão ou sem suporte: o link continua na barra de endereço
    }
  };

  return (
    <section className={estilos.dashboard} aria-labelledby="titulo-pedido">
      <div className={estilos.cabecalho}>
        <div>
          <h2 id="titulo-pedido" className={estilos.titulo}>
            Pedido {entrega.numero_pedido}
          </h2>
          <p className={estilos.resumo}>{cfg.resumo}</p>
        </div>
        <StatusBadge status={entrega.status} />
      </div>

      <div className={estilos.etapas}>
        <Etapas status={entrega.status} />
      </div>

      <dl className={estilos.grade}>
        <Campo icone="origem" rotulo="Origem">
          {entrega.origem_endereco}
        </Campo>
        <Campo icone="destino" rotulo="Destino">
          {entrega.destino_endereco}
        </Campo>
        <Campo icone="mapa" rotulo="Distância">
          {formatarKm(entrega.distancia_km)}
        </Campo>
        <Campo icone="relogio" rotulo="Tempo estimado">
          {formatarMinutos(entrega.tempo_estimado_minutos)}
        </Campo>
      </dl>

      <div className={estilos.historico}>
        <h3 className={estilos.subtitulo}>Histórico</h3>
        <Timeline eventos={entrega.rastreamentos} />
      </div>

      <div className={estilos.rodape}>
        {atualizadoEm ? <span data-teste="atualizado">Atualizado às {formatarHora(atualizadoEm)}</span> : <span />}
        <button type="button" className={estilos.botaoLink} onClick={() => void copiarLink()}>
          <Icon nome="link" tamanho={16} />
          {copiado ? 'Link copiado!' : 'Copiar link'}
        </button>
        <span className="rt-sr-only" role="status">
          {copiado ? 'Link copiado' : ''}
        </span>
      </div>
    </section>
  );
}

function Campo({ rotulo, icone, children }: { rotulo: string; icone: NomeIcone; children: ReactNode }) {
  return (
    <div className={estilos.campo}>
      <dt className={estilos.rotulo}>
        <Icon nome={icone} tamanho={14} />
        {rotulo}
      </dt>
      <dd className={estilos.valor}>{children}</dd>
    </div>
  );
}
