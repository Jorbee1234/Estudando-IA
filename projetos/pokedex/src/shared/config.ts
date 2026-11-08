/** Configuração central: nada de números mágicos espalhados pela UI. */
export const config = {
  apiBaseUrl: 'https://pokeapi.co/api/v2',
  spriteBaseUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon',
  pageSize: 24,
  searchDebounceMs: 300,
  /** Dados da PokéAPI são praticamente estáticos: cache longo. */
  staleTimeMs: 1000 * 60 * 60 * 24,
  gcTimeMs: 1000 * 60 * 60 * 48,
  /** Valor base máximo possível de um stat (usado só para escala visual). */
  statScaleMax: 255,
  movesPageSize: 20,
  tabs: ['overview', 'abilities', 'evolution'] as const,
} as const

export type TabId = (typeof config.tabs)[number]
