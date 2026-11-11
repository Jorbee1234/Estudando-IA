import { formatarDataHora, formatarRecencia } from '../../domain/formatadores';
import { configDoEvento } from '../../domain/status';
import type { EventoRastreamento } from '../../domain/tipos';
import { Icon } from './icons/Icon';
import estilos from './timeline.module.css';

/** `eventos` já vem ordenado (mais recente primeiro) pelo mapper. */
export function Timeline({ eventos }: { eventos: readonly EventoRastreamento[] }) {
  if (eventos.length === 0) return <p className={estilos.vazio}>Sem eventos registrados.</p>;
  return (
    <ol className={estilos.lista}>
      {eventos.map((e) => {
        const cfg = configDoEvento(e.evento);
        return (
          <li key={`${e.data_evento}-${e.id}`} className={estilos.item}>
            <span className={estilos.icone}>
              <Icon nome={cfg.icone} tamanho={16} />
            </span>
            <div className={estilos.corpo}>
              <span className={estilos.evento}>{cfg.rotulo}</span>
              {e.descricao && <span className={estilos.descricao}>{e.descricao}</span>}
              <time className={estilos.hora} dateTime={e.data_evento} title={formatarDataHora(e.data_evento)}>
                {formatarRecencia(e.data_evento)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
