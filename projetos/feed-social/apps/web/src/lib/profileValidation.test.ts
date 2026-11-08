import { describe, expect, it } from 'vitest'
import {
  ACCENT_PRESETS,
  IMAGE_MAX_BYTES,
  contrastAgainstBackground,
  hasEnoughContrast,
  isHexColor,
  messages,
  normalizeUsername,
  validateImageFile,
  validateName,
  validateUsername,
} from './profileValidation'

function fileOf(size: number, type: string) {
  return new File([new Uint8Array(size)], 'x', { type })
}

describe('validateImageFile', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s', (type) => {
    expect(validateImageFile(fileOf(10, type), 'avatar')).toBeUndefined()
  })

  it.each(['image/gif', 'image/svg+xml', 'application/pdf', ''])('rejects the type "%s"', (type) => {
    expect(validateImageFile(fileOf(10, type), 'avatar')).toBe(messages.invalidImageType)
  })

  it('rejects an empty file', () => {
    expect(validateImageFile(fileOf(0, 'image/png'), 'avatar')).toBe(messages.emptyImage)
  })

  it('accepts an avatar of exactly 2 MB and rejects one byte more', () => {
    expect(validateImageFile(fileOf(IMAGE_MAX_BYTES.avatar, 'image/png'), 'avatar')).toBeUndefined()
    expect(validateImageFile(fileOf(IMAGE_MAX_BYTES.avatar + 1, 'image/png'), 'avatar')).toBe(
      messages.avatarTooLarge,
    )
  })

  it('allows a banner up to 4 MB', () => {
    expect(validateImageFile(fileOf(IMAGE_MAX_BYTES.avatar + 1, 'image/png'), 'banner')).toBeUndefined()
    expect(validateImageFile(fileOf(IMAGE_MAX_BYTES.banner + 1, 'image/png'), 'banner')).toBe(
      messages.bannerTooLarge,
    )
  })
})

describe('name', () => {
  it.each(['Jo', 'Júlio Costa', ' Ana ', 'a'.repeat(100)])('accepts "%s"', (value) => {
    expect(validateName(value)).toBeUndefined()
  })

  it.each(['', '   ', 'J', ' J ', 'a'.repeat(101)])('rejects "%s"', (value) => {
    expect(validateName(value)).toBe(messages.invalidName)
  })
})

describe('username', () => {
  it('normalizes by trimming, dropping a leading @ and lower-casing', () => {
    expect(normalizeUsername('  @Julio_Dev ')).toBe('julio_dev')
    expect(normalizeUsername('ANA')).toBe('ana')
  })

  it.each(['abc', 'julio_dev', 'a1_', '@Julio', 'x'.repeat(30)])('accepts "%s"', (value) => {
    expect(validateUsername(value)).toBeUndefined()
  })

  it.each(['', '  ', 'ab', 'x'.repeat(31), 'has space', 'com-hifen', 'acentuação', 'me', 'ADMIN', '@@julio'])(
    'rejects "%s"',
    (value) => {
      expect(validateUsername(value)).toBe(messages.invalidUsername)
    },
  )
})

describe('colors', () => {
  it('recognizes #RRGGBB only', () => {
    expect(isHexColor('#81fe88')).toBe(true)
    expect(isHexColor('81fe88')).toBe(false)
    expect(isHexColor('#81fe8')).toBe(false)
    expect(isHexColor('red')).toBe(false)
  })

  it('computes the contrast against the dark page background', () => {
    expect(contrastAgainstBackground('#FFFFFF')).toBeGreaterThan(15)
    expect(contrastAgainstBackground('#000000')).toBeLessThan(1.1)
  })

  it.each([
    ['#81FE88', true],
    ['#7DD3FC', true],
    ['#000000', false],
    ['#00090E', false],
    ['#111111', false],
  ])('says whether %s has enough contrast: %s', (color, expected) => {
    expect(hasEnoughContrast(color)).toBe(expected)
  })

  it('offers only legible presets', () => {
    expect(ACCENT_PRESETS.every((preset) => hasEnoughContrast(preset.value))).toBe(true)
  })
})
