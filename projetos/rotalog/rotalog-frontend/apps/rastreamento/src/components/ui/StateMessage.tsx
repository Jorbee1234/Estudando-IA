import type { NomeIcone } from '../../domain/icones';
import { Icon } from './icons/Icon';
import estilos from './ui.module.css';

interface Props {
  tipo: 'carregando' | 'erro' | 'vazio';
  mensagem: string;
  titulo?: string;
  aoTentarNovamente?: () => void;
}

const ICONES: Record<Props['tipo'], NomeIcone> = { carregando: 'relogio', erro: 'alerta', vazio: 'busca' };

/** Estado de uma região: carregando/vazio anunciam com `status`; erro com `alert`. */
export function StateMessage({ tipo, mensagem, titulo, aoTentarNovamente }: Props) {
  const erro = tipo === 'erro';
  return (
    <div
      className={`${estilos.estado} ${erro ? estilos.erro : ''}`}
      role={erro ? 'alert' : 'status'}
      aria-live={erro ? 'assertive' : 'polite'}
    >
      <span className={estilos.estadoIcone}>
        <Icon nome={ICONES[tipo]} tamanho={26} />
      </span>
      {titulo && <p className={estilos.estadoTitulo}>{titulo}</p>}
      <p className={estilos.estadoMensagem}>{mensagem}</p>
      {erro && aoTentarNovamente && (
        <button type="button" className={estilos.botao} onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
