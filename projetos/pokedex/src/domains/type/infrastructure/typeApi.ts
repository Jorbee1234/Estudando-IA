import { getJson, idFromUrl, type NamedRef } from '@/shared/api/httpClient'
import { config } from '@/shared/config'

/** ids >= 10000 são tipos "especiais" (unknown, shadow, stellar) — não são filtráveis. */
const SPECIAL_ID_THRESHOLD = 10000
/** Tipos que existem na API mas não classificam Pokémon na Pokédex. */
const HIDDEN_TYPES = new Set(['stellar', 'unknown', 'shadow'])

export async function fetchTypeNames(): Promise<string[]> {
  const data = await getJson<{ results: NamedRef[] }>(`${config.apiBaseUrl}/type?limit=100`)
  return data.results.filter((r) => idFromUrl(r.url) < SPECIAL_ID_THRESHOLD && !HIDDEN_TYPES.has(r.name)).map((r) => r.name)
}

/** Ids dos Pokémon que possuem o tipo (inclui formas alternativas; a interseção com o índice filtra). */
export async function fetchTypeMemberIds(type: string): Promise<number[]> {
  const data = await getJson<{ pokemon: Array<{ pokemon: NamedRef }> }>(`${config.apiBaseUrl}/type/${type}`)
  return data.pokemon.map((p) => idFromUrl(p.pokemon.url))
}
