import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { sampleProfile } from '../../test/fixtures'
import type { Profile } from '../../services/profileService'
import { ProfileHeader } from './ProfileHeader'

function setup(overrides: Partial<Profile> = {}, props: Partial<ComponentProps<typeof ProfileHeader>> = {}) {
  const handlers = { onEditAvatar: vi.fn(), onEditProfile: vi.fn() }
  render(
    <ProfileHeader profile={{ ...sampleProfile, ...overrides }} isOwner={false} {...handlers} {...props} />,
  )
  return handlers
}

describe('ProfileHeader for a visitor', () => {
  it('shows the name, @handle, about and the number of projects', () => {
    setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Júlio Costa' })).toBeInTheDocument()
    expect(screen.getByText('@julio')).toBeInTheDocument()
    expect(screen.getByText('Desenvolvedor front-end.')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Projetos')).toBeInTheDocument()
  })

  it('uses the singular for one project', () => {
    setup({ postsCount: 1 })

    expect(screen.getByText('Projeto')).toBeInTheDocument()
  })

  it('has no edit controls', () => {
    setup()

    expect(screen.queryByRole('button', { name: 'Alterar foto de perfil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar perfil' })).not.toBeInTheDocument()
  })

  it('shows nothing where the about would be when it is empty', () => {
    setup({ about: null })

    expect(screen.queryByText('Conte um pouco sobre você.')).not.toBeInTheDocument()
  })
})

describe('ProfileHeader for the owner', () => {
  it('opens the picture dialog from the avatar', async () => {
    const { onEditAvatar } = setup({}, { isOwner: true })

    await userEvent.click(screen.getByRole('button', { name: 'Alterar foto de perfil' }))

    expect(onEditAvatar).toHaveBeenCalledOnce()
  })

  it('opens the edit dialog from a single Editar perfil button', async () => {
    const { onEditProfile } = setup({}, { isOwner: true })

    await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))

    expect(onEditProfile).toHaveBeenCalledOnce()
  })

  it('no longer has inline editing for the about or the username', () => {
    setup({}, { isOwner: true })

    expect(screen.queryByRole('button', { name: 'Editar sobre' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar @username' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('invites the owner to write something when the about is empty', () => {
    setup({ about: null }, { isOwner: true })

    expect(screen.getByText('Conte um pouco sobre você.')).toBeInTheDocument()
  })
})
