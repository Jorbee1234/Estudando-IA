import { configDoStatus, ETAPAS, STATUS_CONFIG } from '../../domain/status';
import { Icon } from './icons/Icon';
import estilos from './etapas.module.css';

/**
 * Linha de etapas do fluxo normal. A etapa atual leva `aria-current="step"`;
 * cancelada e status desconhecido não seguem o fluxo e mostram um aviso.
 */
export function Etapas({ status }: { status: string }) {
  const cfg = configDoStatus(status);

  if (cfg.etapa === null) {
    const cancelada = cfg.variante === 'CANCELADA';
    return (
      <p className={`${estilos.aviso} ${cancelada ? estilos.avisoCancelada : ''}`} role="note">
        <Icon nome={cancelada ? 'cancelada' : 'alerta'} tamanho={18} />
        {cfg.resumo}
      </p>
    );
  }

  return (
    <ol className={estilos.etapas} aria-label="Etapas da entrega">
      {ETAPAS.map((etapa, indice) => {
        const atual = indice === cfg.etapa;
        const concluida = indice < (cfg.etapa as number);
        const estado = atual ? estilos.atual : concluida ? estilos.concluida : '';
        const { rotulo, icone } = STATUS_CONFIG[etapa];
        return (
          <li key={etapa} className={`${estilos.etapa} ${estado}`} aria-current={atual ? 'step' : undefined}>
            <span className={estilos.marcador}>
              <Icon nome={concluida ? 'entregue' : icone} tamanho={18} />
            </span>
            <span className={estilos.rotulo}>{rotulo}</span>
            {concluida && <span className="rt-sr-only"> (concluída)</span>}
          </li>
        );
      })}
    </ol>
  );
}
