import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { config } from '@/shared/config'
import { useGenerationSpecies } from '@/domains/generation'
import { useTypeMembers } from '@/domains/type'
import { matchesQuery, type Pokemon, type PokemonFilters } from '../domain/pokemon'
import { fetchPokemon, fetchPokemonIndex, fetchSpecies } from '../infrastructure/pokemonApi'

export const pokemonKeys = {
  index: ['pokemon', 'index'] as const,
  detail: (id: number) => ['pokemon', 'detail', id] as const,
  species: (id: number) => ['pokemon', 'species', id] as const,
  page: (f: PokemonFilters) => ['pokemon', 'page', f.q, f.type, f.generation] as const,
}

const detailQuery = (id: number) => ({ queryKey: pokemonKeys.detail(id), queryFn: () => fetchPokemon(id) })

export const usePokemonIndex = () => useQuery({ queryKey: pokemonKeys.index, queryFn: fetchPokemonIndex })

export const usePokemon = (id: number) =>
  useQuery({ ...detailQuery(id), enabled: Number.isInteger(id) && id > 0 })

export const useSpecies = (id: number) =>
  useQuery({
    queryKey: pokemonKeys.species(id),
    queryFn: () => fetchSpecies(id),
    enabled: Number.isInteger(id) && id > 0,
  })

/** Pré-carrega o Pokémon (ex.: no hover do card) para o drawer abrir instantaneamente. */
export function usePrefetchPokemon() {
  const client = useQueryClient()
  return useCallback((id: number) => void client.prefetchQuery(detailQuery(id)), [client])
}

const loadPokemon = (client: QueryClient, id: number): Promise<Pokemon> => client.ensureQueryData(detailQuery(id))

/**
 * Catálogo paginado: filtros/busca restringem a lista de ids (índice ∩ tipo ∩ geração),
 * e cada página busca os detalhes do próximo trecho — alimentando o cache de `usePokemon`.
 */
export function usePokemonCatalog(filters: PokemonFilters) {
  const client = useQueryClient()
  const index = usePokemonIndex()
  const typeMembers = useTypeMembers(filters.type)
  const generationMembers = useGenerationSpecies(filters.generation)

  const waiting =
    index.isPending ||
    (!!filters.type && typeMembers.isPending) ||
    (!!filters.generation && generationMembers.isPending)
  const failed = index.isError || typeMembers.isError || generationMembers.isError

  const ids = useMemo(() => {
    if (!index.data) return []
    const typeSet = filters.type && typeMembers.data ? new Set(typeMembers.data) : null
    const genSet = filters.generation && generationMembers.data ? new Set(generationMembers.data) : null
    return index.data
      .filter((e) => (!typeSet || typeSet.has(e.id)) && (!genSet || genSet.has(e.id)) && matchesQuery(e, filters.q))
      .map((e) => e.id)
  }, [index.data, typeMembers.data, generationMembers.data, filters.type, filters.generation, filters.q])

  const pages = useInfiniteQuery({
    queryKey: pokemonKeys.page(filters),
    initialPageParam: 0,
    enabled: !waiting && !failed,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const slice = ids.slice(pageParam, pageParam + config.pageSize)
      const items = await Promise.all(slice.map((id) => loadPokemon(client, id)))
      const next = pageParam + config.pageSize
      return { items, nextOffset: next < ids.length ? next : null }
    },
    getNextPageParam: (last) => last.nextOffset,
  })

  const items = useMemo(() => pages.data?.pages.flatMap((p) => p.items) ?? [], [pages.data])

  return {
    items,
    total: ids.length,
    isPending: waiting || pages.isPending,
    isError: failed || pages.isError,
    isFetchingNextPage: pages.isFetchingNextPage,
    isRefetching: pages.isPlaceholderData,
    hasNextPage: pages.hasNextPage,
    fetchNextPage: pages.fetchNextPage,
    refetch: () => {
      void index.refetch()
      void pages.refetch()
    },
  }
}
