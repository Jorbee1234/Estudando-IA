import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('exposes the brand name to assistive technology', () => {
    render(<Logo />)

    expect(screen.getByRole('img', { name: 'CodeConnect' })).toBeInTheDocument()
  })
})
