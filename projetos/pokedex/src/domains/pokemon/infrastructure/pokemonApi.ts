import { getJson, idFromUrl, type NamedRef } from '@/shared/api/httpClient'
import { config } from '@/shared/config'
import { cleanText } from '@/shared/lib/format'
import type { Pokemon, PokemonIndexEntry, PokemonSpecies } from '../domain/pokemon'

/* ---------- DTOs (formato cru da PokéAPI — nunca vazam para a UI) ---------- */

interface PokemonDto {
  id: number
  name: string
  height: number
  weight: number
  types: Array<{ slot: number; type: NamedRef }>
  stats: Array<{ base_stat: number; stat: NamedRef }>
  abilities: Array<{ ability: NamedRef; is_hidden: boolean }>
  moves: Array<{
    move: NamedRef
    version_group_details: Array<{ level_learned_at: number; move_learn_method: NamedRef; version_group: NamedRef }>
  }>
  cries?: { latest?: string | null; legacy?: string | null }
  sprites: {
    other?: {
      'official-artwork'?: { front_default?: string | null; front_shiny?: string | null }
    }
    versions?: {
      'generation-v'?: {
        'black-white'?: { animated?: { front_default?: string | null; front_shiny?: string | null } }
      }
    }
  }
}

interface SpeciesDto {
  id: number
  generation?: NamedRef
  evolution_chain?: { url: string } | null
  genera: Array<{ genus: string; language: NamedRef }>
  flavor_text_entries: Array<{ flavor_text: string; language: NamedRef }>
}

/* ---------- Mappers DTO -> domínio ---------- */

function toPokemon(dto: PokemonDto): Pokemon {
  const artwork = dto.sprites.other?.['official-artwork']
  const animated = dto.sprites.versions?.['generation-v']?.['black-white']?.animated
  return {
    id: dto.id,
    name: dto.name,
    height: dto.height,
    weight: dto.weight,
    types: [...dto.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    stats: dto.stats.map((s) => ({ key: s.stat.name, value: s.base_stat })),
    abilities: dto.abilities.map((a) => ({ name: a.ability.name, isHidden: a.is_hidden })),
    moves: dto.moves.map((m) => {
      // Usa o grupo de versão mais recente (maior id); dentro dele, prefere "level-up".
      const details = m.version_group_details
      const newest = Math.max(...details.map((d) => idFromUrl(d.version_group.url)))
      const inNewest = details.filter((d) => idFromUrl(d.version_group.url) === newest)
      const chosen = inNewest.find((d) => d.move_learn_method.name === 'level-up') ?? inNewest[0]
      return {
        name: m.move.name,
        method: chosen?.move_learn_method.name ?? 'unknown',
        level: chosen?.level_learned_at ?? 0,
      }
    }),
    sprites: {
      artwork: artwork?.front_default ?? null,
      artworkShiny: artwork?.front_shiny ?? null,
      animated: animated?.front_default ?? null,
      animatedShiny: animated?.front_shiny ?? null,
    },
    cry: dto.cries?.latest ?? dto.cries?.legacy ?? null,
  }
}

function toSpecies(dto: SpeciesDto): PokemonSpecies {
  const en = <T extends { language: NamedRef }>(list: T[]) => list.filter((e) => e.language.name === 'en')
  const flavor = en(dto.flavor_text_entries).at(-1)
  const chainUrl = dto.evolution_chain?.url
  return {
    id: dto.id,
    genus: en(dto.genera)[0]?.genus ?? null,
    flavorText: flavor ? cleanText(flavor.flavor_text) : null,
    generation: dto.generation?.name ?? null,
    evolutionChainId: chainUrl ? idFromUrl(chainUrl) : null,
  }
}

/* ---------- Chamadas ---------- */

/** Índice leve (id + nome) de todas as espécies; base da busca e da paginação. */
export async function fetchPokemonIndex(): Promise<PokemonIndexEntry[]> {
  const data = await getJson<{ results: NamedRef[] }>(`${config.apiBaseUrl}/pokemon-species?limit=100000`)
  return data.results
    .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
    .filter((e) => Number.isFinite(e.id))
    .sort((a, b) => a.id - b.id)
}

export async function fetchPokemon(id: number): Promise<Pokemon> {
  return toPokemon(await getJson<PokemonDto>(`${config.apiBaseUrl}/pokemon/${id}`))
}

export async function fetchSpecies(id: number): Promise<PokemonSpecies> {
  return toSpecies(await getJson<SpeciesDto>(`${config.apiBaseUrl}/pokemon-species/${id}`))
}

/** URL determinística do artwork oficial (usada onde só temos o id, ex.: linha evolutiva). */
export const artworkUrl = (id: number) => `${config.spriteBaseUrl}/other/official-artwork/${id}.png`
export const artworkShinyUrl = (id: number) => `${config.spriteBaseUrl}/other/official-artwork/shiny/${id}.png`
