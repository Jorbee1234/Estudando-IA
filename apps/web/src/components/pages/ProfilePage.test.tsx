import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { sampleProfile, samplePost } from '../../test/fixtures'
import { ProfilePage } from './ProfilePage'

function setup(overrides: Partial<Parameters<typeof ProfilePage>[0]> = {}) {
  const handlers = {
    onEditAvatar: vi.fn(),
    onEditAppearance: vi.fn(),
    onEditProfile: vi.fn(),
    onLoadMore: vi.fn(),
    onLike: vi.fn(),
    onShare: vi.fn(),
    onComment: vi.fn(),
  }
  const view = render(
    <MemoryRouter>
      <ProfilePage
        profile={sampleProfile}
        loading={false}
        isOwner={false}
        posts={[samplePost]}
        postsLoading={false}
        loadingMore={false}
        hasMore={false}
        {...handlers}
        {...overrides}
      />
    </MemoryRouter>,
  )
  return { ...handlers, ...view }
}

describe('ProfilePage', () => {
  it('shows the profile and the posts of the user', () => {
    setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Júlio Costa' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Landing page responsiva' })).toBeInTheDocument()
  })

  it('calls the section Projetos for visitors and Meus projetos for the owner', () => {
    const { unmount } = setup()
    expect(screen.getByRole('heading', { level: 2, name: 'Projetos' })).toBeInTheDocument()
    unmount()

    setup({ isOwner: true })
    expect(screen.getByRole('heading', { level: 2, name: 'Meus projetos' })).toBeInTheDocument()
  })

  it('shows a loading message while the profile loads', () => {
    setup({ profile: undefined, loading: true })

    expect(screen.getByRole('status')).toHaveTextContent('Carregando perfil...')
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('shows the error when the profile cannot be found', () => {
    setup({ profile: undefined, loading: false, error: 'Perfil não encontrado.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Perfil não encontrado.')
  })

  it('applies the accent color of the user to the page', () => {
    const { container } = setup({ profile: { ...sampleProfile, accentColor: '#7DD3FC' } })

    expect(container.firstElementChild?.getAttribute('style')).toContain('--color-accent: #7DD3FC')
  })

  it('keeps the default accent when the user has no color', () => {
    const { container } = setup()

    expect(container.firstElementChild).not.toHaveAttribute('style')
  })

  it('tells a visitor when the user has no projects', () => {
    setup({ posts: [] })

    expect(screen.getByText('Nenhum projeto publicado ainda.')).toBeInTheDocument()
  })

  it('tells the owner when they have no projects', () => {
    setup({ posts: [], isOwner: true })

    expect(screen.getByText('Você ainda não publicou nenhum projeto.')).toBeInTheDocument()
  })

  it('shows a loading message for the first page of projects', () => {
    setup({ posts: [], postsLoading: true })

    expect(screen.getByText('Carregando projetos...')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum projeto publicado ainda.')).not.toBeInTheDocument()
  })

  it('shows errors from the projects list and from actions', () => {
    setup({ postsError: 'Falhou a lista.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou a lista.')
  })

  it('shows the copied-link notice', () => {
    setup({ notice: 'Link copiado!' })

    expect(screen.getByRole('status')).toHaveTextContent('Link copiado!')
  })

  it('loads more projects', async () => {
    const { onLoadMore } = setup({ hasMore: true })

    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('offers the owner the controls to change the picture, banner and about', async () => {
    const { onEditAvatar, onEditAppearance } = setup({ isOwner: true })

    await userEvent.click(screen.getByRole('button', { name: 'Alterar foto de perfil' }))
    await userEvent.click(screen.getByRole('button', { name: 'Banner e cor' }))

    expect(onEditAvatar).toHaveBeenCalledOnce()
    expect(onEditAppearance).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Editar perfil' })).toBeInTheDocument()
  })

  it('hides every edit control from visitors', () => {
    setup()

    expect(screen.queryByRole('button', { name: 'Alterar foto de perfil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Banner e cor' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar perfil' })).not.toBeInTheDocument()
  })
})
