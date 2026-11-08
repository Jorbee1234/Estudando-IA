import { describe, expect, it } from 'vitest'
import { avatarColor, placeholderGradient } from './placeholderGradient'

describe('placeholderGradient', () => {
  it('is deterministic for the same seed', () => {
    expect(placeholderGradient('post-1')).toBe(placeholderGradient('post-1'))
  })

  it('differs between seeds', () => {
    expect(placeholderGradient('post-1')).not.toBe(placeholderGradient('post-2'))
  })

  it('builds a CSS gradient', () => {
    expect(placeholderGradient('x')).toMatch(/^linear-gradient\(135deg, hsl\(/)
  })
})

describe('avatarColor', () => {
  it('is deterministic', () => {
    expect(avatarColor('julio')).toBe(avatarColor('julio'))
  })
})
