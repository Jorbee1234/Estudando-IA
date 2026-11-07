import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SidebarMenu } from './SidebarMenu'

function setup(authenticated: boolean, profileHref?: string, route = '/') {
  const handlers = { onPublish: vi.fn(), onLogin: vi.fn(), onLogout: vi.fn() }
  render(
    <MemoryRouter initialEntries={[route]}>
      <SidebarMenu authenticated={authenticated} profileHref={profileHref} {...handlers} />
    </MemoryRouter>,
  )
  return handlers
}

describe('SidebarMenu', () => {
  it('offers Sair, and not Entrar, when logged in', async () => {
    const { onLogout } = setup(true)

    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('offers Entrar, and not Sair, to visitors', async () => {
    const { onLogin } = setup(false)

    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(onLogin).toHaveBeenCalledOnce()
  })

  it('has the Publicar button and the feed link', async () => {
    const { onPublish } = setup(false)

    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(onPublish).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'Feed' })).toHaveAttribute('href', '/')
  })

  it('links a logged in user to their own profile', () => {
    setup(true, '/perfil/u1')

    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil/u1')
  })

  it('asks a visitor to log in when they click Perfil', async () => {
    const { onLogin } = setup(false)

    expect(screen.queryByRole('link', { name: 'Perfil' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Perfil' }))

    expect(onLogin).toHaveBeenCalledOnce()
  })

  it('marks Feed as the current page on the feed', () => {
    setup(true, '/perfil/u1', '/')
    expect(screen.getByRole('link', { name: 'Feed' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Perfil' })).not.toHaveAttribute('aria-current')
  })

  it('marks Perfil as the current page on the own profile', () => {
    setup(true, '/perfil/u1', '/perfil/u1')

    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Feed' })).not.toHaveAttribute('aria-current')
  })

  it('does not mark Perfil as current on somebody else profile', () => {
    setup(true, '/perfil/u1', '/perfil/u2')

    expect(screen.getByRole('link', { name: 'Perfil' })).not.toHaveAttribute('aria-current')
  })
})
