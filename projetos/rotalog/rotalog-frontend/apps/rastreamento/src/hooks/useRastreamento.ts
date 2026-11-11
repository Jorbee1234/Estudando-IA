import { useQuery } from '@tanstack/react-query';
import { buscarPorPedido } from '../api/rastreamentoApi';
import { env } from '../config/env';

/**
 * Pedido consultado, atualizado por polling. Só consulta com um número informado,
 * pausa com a aba oculta (`refetchIntervalInBackground: false`) e cancela a
 * requisição ao trocar de pedido ou desmontar (`signal`). `data === null` = não encontrado.
 */
export function useRastreamento(numero: string | null) {
  return useQuery({
    queryKey: ['pedido', numero],
    queryFn: ({ signal }) => buscarPorPedido(numero as string, signal),
    enabled: numero !== null,
    refetchInterval: env.pollingMs,
    refetchIntervalInBackground: false,
  });
}
