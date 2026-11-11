import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Icon } from './icons/Icon';
import type { NomeIcone } from '../../domain/icones';
import estilos from './abas.module.css';

export type IdAba = 'detalhes' | 'mapa';

const ABAS: { id: IdAba; rotulo: string; icone: NomeIcone }[] = [
  { id: 'detalhes', rotulo: 'Detalhes', icone: 'lista' },
  { id: 'mapa', rotulo: 'Mapa', icone: 'mapa' },
];

export const idAba = (id: IdAba) => `aba-${id}`;
export const idPainel = (id: IdAba) => `painel-${id}`;

/**
 * Abas "Detalhes | Mapa" para telas estreitas (padrão `tablist`: foco itinerante,
 * setas, Home e End). Os painéis ficam sempre montados; só mudam de visibilidade.
 */
export function Abas({ ativa, aoTrocar }: { ativa: IdAba; aoTrocar: (id: IdAba) => void }) {
  const refs = useRef<Record<IdAba, HTMLButtonElement | null>>({ detalhes: null, mapa: null });

  const aoTeclar = (evento: KeyboardEvent, indice: number) => {
    const ultimo = ABAS.length - 1;
    const destino =
      evento.key === 'ArrowRight' ? (indice + 1) % ABAS.length
      : evento.key === 'ArrowLeft' ? (indice - 1 + ABAS.length) % ABAS.length
      : evento.key === 'Home' ? 0
      : evento.key === 'End' ? ultimo
      : null;
    if (destino === null) return;
    evento.preventDefault();
    const alvo = ABAS[destino];
    if (!alvo) return;
    aoTrocar(alvo.id);
    refs.current[alvo.id]?.focus();
  };

  return (
    <div className={estilos.abas} role="tablist" aria-label="Seções do resultado">
      {ABAS.map((aba, indice) => {
        const selecionada = aba.id === ativa;
        return (
          <button
            key={aba.id}
            ref={(el) => {
              refs.current[aba.id] = el;
            }}
            id={idAba(aba.id)}
            type="button"
            role="tab"
            className={`${estilos.aba} ${selecionada ? estilos.selecionada : ''}`}
            aria-selected={selecionada}
            aria-controls={idPainel(aba.id)}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => aoTrocar(aba.id)}
            onKeyDown={(e) => aoTeclar(e, indice)}
          >
            <Icon nome={aba.icone} tamanho={18} />
            {aba.rotulo}
          </button>
        );
      })}
    </div>
  );
}
