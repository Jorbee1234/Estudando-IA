import { getJson, idFromUrl, type NamedRef } from '@/shared/api/httpClient'
import { config } from '@/shared/config'

export type EvolutionCondition =
  | { kind: 'level'; value: number }
  | { kind: 'item' | 'heldItem' | 'time' | 'move' | 'location'; value: string }
  | { kind: 'happiness' | 'trade' | 'other' }

export interface EvolutionNode {
  id: number
  name: string
  /** Condições (alternativas) para evoluir PARA este nó, a partir do anterior. */
  conditions: EvolutionCondition[]
  children: EvolutionNode[]
}

interface DetailDto {
  trigger: NamedRef
  min_level: number | null
  item: NamedRef | null
  held_item: NamedRef | null
  min_happiness: number | null
  min_affection: number | null
  time_of_day: string
  known_move: NamedRef | null
  location: NamedRef | null
}

interface ChainLinkDto {
  species: NamedRef
  evolution_details: DetailDto[]
  evolves_to: ChainLinkDto[]
}

function toConditions(details: DetailDto[]): EvolutionCondition[] {
  return details.map((d): EvolutionCondition => {
    if (d.min_level) return { kind: 'level', value: d.min_level }
    if (d.item) return { kind: 'item', value: d.item.name }
    if (d.held_item) return { kind: 'heldItem', value: d.held_item.name }
    if (d.min_happiness || d.min_affection) return { kind: 'happiness' }
    if (d.known_move) return { kind: 'move', value: d.known_move.name }
    if (d.location) return { kind: 'location', value: d.location.name }
    if (d.time_of_day) return { kind: 'time', value: d.time_of_day }
    if (d.trigger.name === 'trade') return { kind: 'trade' }
    return { kind: 'other' }
  })
}

function toNode(link: ChainLinkDto): EvolutionNode {
  return {
    id: idFromUrl(link.species.url),
    name: link.species.name,
    conditions: toConditions(link.evolution_details),
    children: link.evolves_to.map(toNode),
  }
}

export async function fetchEvolutionChain(id: number): Promise<EvolutionNode> {
  const dto = await getJson<{ chain: ChainLinkDto }>(`${config.apiBaseUrl}/evolution-chain/${id}`)
  return toNode(dto.chain)
}
