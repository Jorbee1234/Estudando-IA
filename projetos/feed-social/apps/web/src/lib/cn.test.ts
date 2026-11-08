import { describe, expect, it } from 'vitest'
import { cn, focusRing } from './cn'

describe('cn', () => {
  it('joins truthy class values and drops falsy ones', () => {
    expect(cn('a', false, undefined, null, 'b', { c: true, d: false })).toBe('a b c')
  })

  it('lets the last conflicting Tailwind class win', () => {
    expect(cn('size-[1.25em]', 'size-8')).toBe('size-8')
  })

  it('keeps non-conflicting classes', () => {
    expect(cn('px-2 text-sm', 'py-1')).toBe('px-2 text-sm py-1')
  })
})

describe('focusRing', () => {
  it('exposes the shared focus outline classes', () => {
    expect(focusRing).toContain('focus-visible:outline-accent')
  })
})
