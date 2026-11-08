import { titleCase } from '@/shared/lib/format'

/** Textos de interface. Nomes/efeitos vindos da API permanecem em inglês (lang="en"). */
export const t = {
  appTitle: 'Pokédex',
  skipToContent: 'Pular para o conteúdo',
  loading: 'Carregando…',
  retry: 'Tentar novamente',
  close: 'Fechar',
  genericError: 'Não foi possível carregar os dados.',
  search: { label: 'Buscar Pokémon', placeholder: 'Nome ou número…' },
  filters: {
    type: 'Filtrar por tipo',
    generation: 'Geração',
    allGenerations: 'Todas as gerações',
    clear: 'Limpar filtros',
  },
  settings: {
    group: 'Preferências',
    shiny: 'Modo Brilho (Shiny)',
    soundOn: 'Sons de interface ligados',
    soundOff: 'Sons de interface desligados',
    motion: 'Reduzir animações',
  },
  list: {
    title: 'Pokémon',
    empty: 'Nenhum Pokémon encontrado com esses filtros.',
    loadMore: 'Carregar mais',
    loadingMore: 'Carregando mais Pokémon…',
    count: (shown: number, total: number) => `${shown} de ${total} Pokémon carregados`,
  },
  drawer: {
    label: (name: string) => `Detalhes de ${name}`,
    tabs: { overview: 'Visão geral', abilities: 'Habilidades', evolution: 'Evolução' },
    tabsLabel: 'Seções do Pokémon',
    height: 'Altura',
    weight: 'Peso',
    generation: 'Geração',
    category: 'Categoria',
    stats: 'Atributos base',
    playCry: (name: string) => `Tocar grito de ${name}`,
    cryPlaying: 'Tocando grito…',
    noCry: 'Grito indisponível',
    abilities: 'Habilidades',
    hidden: 'Oculta',
    moves: 'Golpes',
    allMoves: 'Todos',
    showMoreMoves: 'Mostrar mais golpes',
    level: (n: number) => (n > 0 ? `Nv. ${n}` : '—'),
    noMoves: 'Sem golpes registrados.',
    evolution: 'Linha evolutiva',
    noEvolution: 'Este Pokémon não evolui.',
    currentForm: 'Forma atual',
    notFound: 'Pokémon não encontrado.',
    spriteAlt: (name: string, shiny: boolean) => `Arte oficial de ${name}${shiny ? ' (versão Shiny)' : ''}`,
  },
  evolutionCondition: {
    level: (n: number) => `Nível ${n}`,
    item: (i: string) => `Usar ${i}`,
    heldItem: (i: string) => `Segurando ${i}`,
    happiness: 'Alta amizade',
    time: (v: string) => (v === 'day' ? 'De dia' : v === 'night' ? 'De noite' : v),
    move: (m: string) => `Conhecendo ${m}`,
    location: (l: string) => `Em ${l}`,
    trade: 'Troca',
    other: 'Condição especial',
  },
} as const

const typeLabels: Record<string, string> = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta', ice: 'Gelo',
  fighting: 'Lutador', poison: 'Veneno', ground: 'Terra', flying: 'Voador', psychic: 'Psíquico',
  bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio', steel: 'Aço', fairy: 'Fada',
}
export const typeLabel = (name: string) => typeLabels[name] ?? titleCase(name)

const statLabels: Record<string, string> = {
  hp: 'HP', attack: 'Ataque', defense: 'Defesa', 'special-attack': 'Atq. Especial',
  'special-defense': 'Def. Especial', speed: 'Velocidade',
}
const statShort: Record<string, string> = {
  hp: 'HP', attack: 'Atq', defense: 'Def', 'special-attack': 'AtqE', 'special-defense': 'DefE', speed: 'Vel',
}
export const statLabel = (name: string) => statLabels[name] ?? titleCase(name)
export const statShortLabel = (name: string) => statShort[name] ?? statLabel(name)

const methodLabels: Record<string, string> = {
  'level-up': 'Por nível', machine: 'TM/HM', egg: 'Ovo', tutor: 'Tutor',
}
export const methodLabel = (name: string) => methodLabels[name] ?? titleCase(name)

export const generationLabel = (name: string) => `Geração ${name.replace('generation-', '').toUpperCase()}`
