import { describe, expect, it } from 'vitest'
import { matchesQuery, pickSprite } from './pokemon'

describe('matchesQuery', () => {
  const entry = { id: 25, name: 'pikachu' }
  it('casa por trecho do nome, sem diferenciar maiúsculas', () => expect(matchesQuery(entry, 'PIKA')).toBe(true))
  it('casa por número, com ou sem # e zeros', () => {
    expect(matchesQuery(entry, '25')).toBe(true)
    expect(matchesQuery(entry, '#0025')).toBe(true)
    expect(matchesQuery(entry, '26')).toBe(false)
  })
  it('busca vazia casa tudo', () => expect(matchesQuery(entry, '  ')).toBe(true))
})

describe('pickSprite', () => {
  const none = { artwork: null, artworkShiny: null, animated: null, animatedShiny: null }
  it('cai para o artwork normal quando falta a versão shiny', () =>
    expect(pickSprite({ ...none, artwork: 'a.png' }, { shiny: true })).toBe('a.png'))
  it('prefere o GIF animado quando pedido e disponível', () =>
    expect(pickSprite({ ...none, artwork: 'a.png', animated: 'a.gif' }, { shiny: false, animated: true })).toBe('a.gif'))
  it('retorna null se não há nenhuma imagem', () => expect(pickSprite(none, { shiny: false })).toBeNull())
})
