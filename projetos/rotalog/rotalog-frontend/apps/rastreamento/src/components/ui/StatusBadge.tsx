import { configDoStatus } from '../../domain/status';
import { Icon } from './icons/Icon';
import estilos from './ui.module.css';

/** Texto + ícone, nunca só cor. */
export function StatusBadge({ status }: { status: string }) {
  const cfg = configDoStatus(status);
  return (
    <span className={`${estilos.badge} ${estilos[cfg.variante]}`}>
      <Icon nome={cfg.icone} tamanho={14} />
      {cfg.rotulo}
    </span>
  );
}
