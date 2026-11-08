import { describe, expect, it } from 'vitest'
import { typeTheme } from '@/domains/type'
import { contrastRatio, readableOn } from './color'

const TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying',
  'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'tipo-desconhecido']

describe('contraste dos badges de tipo (WCAG 1.4.3)', () => {
  it.each(TYPES)('%s: texto sobre a cor do tipo tem contraste >= 4.5:1', (type) => {
    const { color } = typeTheme(type)
    expect(contrastRatio(color, readableOn(color))).toBeGreaterThanOrEqual(4.5)
  })
})
