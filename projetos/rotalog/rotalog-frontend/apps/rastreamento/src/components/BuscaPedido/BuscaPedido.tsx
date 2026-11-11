import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../ui/icons/Icon';
import estilos from './BuscaPedido.module.css';

interface Props {
  /** Chamado com o número já sem espaços nas pontas. */
  aoBuscar: (numero: string) => void;
  /** `hero`: tela inicial (rótulo visível, campo grande). `compacta`: cabeçalho. */
  variante?: 'hero' | 'compacta';
  valorInicial?: string;
}

/** Busca pública por número do pedido (ADR 0002, D5b): não existe mais lista de entregas. */
export function BuscaPedido({ aoBuscar, variante = 'hero', valorInicial = '' }: Props) {
  const [valor, setValor] = useState(valorInicial);
  const id = useId();

  // Voltar/avançar do navegador troca o pedido: o campo acompanha.
  useEffect(() => setValor(valorInicial), [valorInicial]);

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const numero = valor.trim();
    if (numero) aoBuscar(numero);
  };

  return (
    <form
      className={`${estilos.form} ${variante === 'hero' ? estilos.hero : estilos.compacta}`}
      onSubmit={enviar}
      role="search"
      aria-label="Buscar pedido"
    >
      <label htmlFor={id} className={variante === 'hero' ? estilos.rotulo : 'rt-sr-only'}>
        Número do pedido
      </label>
      <div className={estilos.linha}>
        <input
          id={id}
          className={estilos.campo}
          type="text"
          value={valor}
          maxLength={50}
          placeholder="Ex.: PED-001"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => setValor(e.target.value)}
        />
        <button type="submit" className={estilos.botao} disabled={valor.trim() === ''}>
          <Icon nome="busca" tamanho={18} />
          Rastrear
        </button>
      </div>
    </form>
  );
}
