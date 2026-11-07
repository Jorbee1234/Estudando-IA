import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TextLink } from './TextLink'

describe('TextLink', () => {
  it('renders a link to the given address', () => {
    render(
      <MemoryRouter>
        <TextLink href="/cadastro">Crie seu cadastro!</TextLink>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Crie seu cadastro!' }),
    ).toHaveAttribute('href', '/cadastro')
  })

  it('applies the chosen variant', () => {
    render(
      <MemoryRouter>
        <TextLink href="/cadastro" variant="accent">
          Crie seu cadastro!
        </TextLink>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link')).toHaveClass('text-accent')
  })
})
