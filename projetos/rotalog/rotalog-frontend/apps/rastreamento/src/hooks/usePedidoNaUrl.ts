import { useCallback, useEffect, useState } from 'react';

const PARAMETRO = 'pedido';
const TAMANHO_MAXIMO = 50; // mesmo limite do campo e da API

/** Lê `?pedido=` e ignora valor vazio ou maior que o limite (ADR 0004, D8). */
export function lerPedidoDaUrl(search: string): string | null {
  const valor = new URLSearchParams(search).get(PARAMETRO)?.trim();
  return valor && valor.length <= TAMANHO_MAXIMO ? valor : null;
}

/**
 * Pedido consultado, sincronizado com `?pedido=` (sem biblioteca de rota).
 * Buscar empilha uma entrada no histórico; voltar/avançar do navegador funciona.
 */
export function usePedidoNaUrl(): [string | null, (numero: string | null) => void] {
  const [numero, setNumero] = useState<string | null>(() => lerPedidoDaUrl(window.location.search));

  useEffect(() => {
    const aoNavegar = () => setNumero(lerPedidoDaUrl(window.location.search));
    window.addEventListener('popstate', aoNavegar);
    return () => window.removeEventListener('popstate', aoNavegar);
  }, []);

  const definir = useCallback((novo: string | null) => {
    if (novo === lerPedidoDaUrl(window.location.search)) {
      setNumero(novo);
      return;
    }
    const url = new URL(window.location.href);
    if (novo) url.searchParams.set(PARAMETRO, novo);
    else url.searchParams.delete(PARAMETRO);
    window.history.pushState(null, '', url);
    setNumero(novo);
  }, []);

  return [numero, definir];
}
