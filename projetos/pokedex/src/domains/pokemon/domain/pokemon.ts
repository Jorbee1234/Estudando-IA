export interface PokemonStat {
  key: string
  value: number
}

export interface PokemonAbilityRef {
  name: string
  isHidden: boolean
}

export interface PokemonMove {
  name: string
  method: string
  level: number
}

export interface PokemonSprites {
  artwork: string | null
  artworkShiny: string | null
  animated: string | null
  animatedShiny: string | null
}

export interface Pokemon {
  id: number
  name: string
  types: string[]
  stats: PokemonStat[]
  abilities: PokemonAbilityRef[]
  moves: PokemonMove[]
  sprites: PokemonSprites
  cry: string | null
  height: number
  weight: number
}

export interface PokemonIndexEntry {
  id: number
  name: string
}

export interface PokemonSpecies {
  id: number
  genus: string | null
  flavorText: string | null
  generation: string | null
  evolutionChainId: number | null
}

export interface PokemonFilters {
  q: string
  type: string | null
  generation: string | null
}

export const primaryType = (p: Pick<Pokemon, 'types'>): string | null => p.types[0] ?? null

/** Sprite principal respeitando o modo Shiny, com fallbacks para campos ausentes na API. */
export function pickSprite(p: PokemonSprites, opts: { shiny: boolean; animated?: boolean }): string | null {
  const { shiny, animated = false } = opts
  const artwork = shiny ? (p.artworkShiny ?? p.artwork) : p.artwork
  const gif = shiny ? (p.animatedShiny ?? p.animated) : p.animated
  return animated ? (gif ?? artwork) : (artwork ?? gif)
}

/** Aplica busca (nome/número) sobre o índice; filtros por conjuntos de ids são aplicados antes. */
export function matchesQuery(entry: PokemonIndexEntry, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase().replace(/^#/, '')
  if (!q) return true
  return entry.name.includes(q) || String(entry.id) === q.replace(/^0+/, '')
}
