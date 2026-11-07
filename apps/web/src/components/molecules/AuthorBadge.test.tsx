import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthorBadge } from './AuthorBadge'

describe('AuthorBadge', () => {
  it('shows the @handle with the full name as a tooltip', () => {
    render(<AuthorBadge name="Júlio Costa" handle="julio" />)

    expect(screen.getByText('@julio')).toHaveAttribute('title', 'Júlio Costa')
  })

  it('shows the picture of the author instead of the initial', () => {
    const { container } = render(
      <AuthorBadge name="Júlio Costa" handle="julio" avatarUrl="/api/profiles/u1/avatar?v=1" />,
    )

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/profiles/u1/avatar?v=1')
  })

  it('falls back to the initial when there is no picture', () => {
    const { container } = render(<AuthorBadge name="Júlio Costa" handle="julio" avatarUrl={null} />)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container).toHaveTextContent('J')
  })

  it('is not a link without a user id', () => {
    render(<AuthorBadge name="Júlio Costa" handle="julio" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links to the author profile when it has a user id', () => {
    render(
      <MemoryRouter>
        <AuthorBadge name="Júlio Costa" handle="julio" userId="u1" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Ver perfil de Júlio Costa' })).toHaveAttribute('href', '/perfil/u1')
  })
})
