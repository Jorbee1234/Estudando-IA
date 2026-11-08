import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { NavItem } from './NavItem'

describe('NavItem', () => {
  it('links to its destination and marks the current page', () => {
    render(
      <MemoryRouter>
        <NavItem icon="feed" label="Feed" href="/" active />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Feed' })
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('acts as a button when it has no destination', async () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <NavItem icon="logout" label="Sair" onClick={onClick} />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled for sections that do not exist yet', () => {
    render(
      <MemoryRouter>
        <NavItem icon="account" label="Perfil" href="/perfil" disabled />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Perfil' })).toBeDisabled()
  })
})
