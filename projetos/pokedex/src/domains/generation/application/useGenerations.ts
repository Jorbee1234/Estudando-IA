import { useQuery } from '@tanstack/react-query'
import { fetchGenerations, fetchGenerationSpeciesIds } from '../infrastructure/generationApi'

export const generationKeys = {
  all: ['generations'] as const,
  species: (name: string) => ['generations', 'species', name] as const,
}

export const useGenerations = () => useQuery({ queryKey: generationKeys.all, queryFn: fetchGenerations })

export const useGenerationSpecies = (generation: string | null) =>
  useQuery({
    queryKey: generationKeys.species(generation ?? ''),
    queryFn: () => fetchGenerationSpeciesIds(generation as string),
    enabled: !!generation,
  })
