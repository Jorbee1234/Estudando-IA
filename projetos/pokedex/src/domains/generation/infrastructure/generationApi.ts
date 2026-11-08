import { getJson, idFromUrl, type NamedRef } from '@/shared/api/httpClient'
import { config } from '@/shared/config'

export interface Generation {
  id: number
  name: string
}

export async function fetchGenerations(): Promise<Generation[]> {
  const data = await getJson<{ results: NamedRef[] }>(`${config.apiBaseUrl}/generation`)
  return data.results.map((r) => ({ id: idFromUrl(r.url), name: r.name }))
}

/** Ids das espécies introduzidas na geração (id da espécie == id do Pokémon padrão). */
export async function fetchGenerationSpeciesIds(generation: string): Promise<number[]> {
  const data = await getJson<{ pokemon_species: NamedRef[] }>(`${config.apiBaseUrl}/generation/${generation}`)
  return data.pokemon_species.map((s) => idFromUrl(s.url))
}
