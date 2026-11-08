import { useQuery } from '@tanstack/react-query'
import { fetchEvolutionChain } from '../infrastructure/evolutionApi'

export const useEvolutionChain = (chainId: number | null) =>
  useQuery({
    queryKey: ['evolution-chain', chainId],
    queryFn: () => fetchEvolutionChain(chainId as number),
    enabled: chainId !== null,
  })
