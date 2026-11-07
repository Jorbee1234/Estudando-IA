import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { sampleProfile, samplePost } from '../test/fixtures'
import { AppLayout } from './AppLayout'
import { ProfileRoute } from './ProfileRoute'

vi.mock('../services/postService', () => ({
  listPosts: vi.fn(),
  listTags: vi.fn(),
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  listComments: vi.fn(),
  createComment: vi.fn(),
  createPost: vi.fn(),
}))

vi.mock('../services/profileService', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadImage: vi.fn(),
  removeImage: vi.fn(),
}))

const posts = await import('../services/postService')
const profiles = await import('../services/profileService')

const owner = { id: 'u1', name: 'Júlio Costa', email: 'julio@example.com', links: [] }
const png = new File([new Uint8Array(10)], 'foto.png', { type: 'image/png' })

function renderProfile(userId = 'u1', auth: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    user: null,
    loading: false,
    login: vi.fn().mockResolvedValue(undefined),
    signup: vi.fn(),
    logout: vi.fn(),
    ...auth,
  }
  render(
    <AuthContext value={value}>
      <MemoryRouter initialEntries={[`/perfil/${userId}`]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/perfil/:userId" element={<ProfileRoute />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

function apiError(status: number, detail: string, errors?: Record<string, string[]>) {
  const error = new AxiosError('failed')
  error.response = { status, data: { detail, errors } } as AxiosError['response']
  return error
}

beforeEach(() => {
  vi.resetAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
  vi.mocked(profiles.getProfile).mockResolvedValue(sampleProfile)
  vi.mocked(posts.listPosts).mockResolvedValue({ items: [samplePost], nextCursor: null, links: [] })
  vi.mocked(posts.listTags).mockResolvedValue([])
  vi.mocked(posts.likePost).mockResolvedValue(undefined)
  vi.mocked(profiles.updateProfile).mockResolvedValue(sampleProfile)
  vi.mocked(profiles.uploadImage).mockResolvedValue(undefined)
  vi.mocked(profiles.removeImage).mockResolvedValue(undefined)
})

describe('profile screen as a visitor', () => {
  it('loads the profile and only the posts of that user', async () => {
    renderProfile('u1')

    expect(await screen.findByRole('heading', { level: 1, name: 'Júlio Costa' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Landing page responsiva' })).toBeInTheDocument()
    expect(profiles.getProfile).toHaveBeenCalledWith('u1')
    expect(posts.listPosts).toHaveBeenCalledWith(expect.objectContaining({ authorId: 'u1' }))
  })

  it('has no edit controls', async () => {
    renderProfile('u1')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: 'Alterar foto de perfil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Banner e cor' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar sobre' })).not.toBeInTheDocument()
  })

  it('asks the visitor to log in when they like a project', async () => {
    renderProfile('u1')

    await userEvent.click(await screen.findByRole('button', { name: 'Curtir 5' }))

    expect(await screen.findByRole('dialog', { name: 'Login' })).toBeInTheDocument()
    expect(posts.likePost).not.toHaveBeenCalled()
  })

  it('shows the error when the profile does not exist', async () => {
    vi.mocked(profiles.getProfile).mockRejectedValue(apiError(404, 'Perfil não encontrado.'))
    renderProfile('nope')

    expect(await screen.findByRole('alert')).toHaveTextContent('Perfil não encontrado.')
  })

  it('does not show edit controls on somebody else profile even when logged in', async () => {
    renderProfile('u2', { user: owner })

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: 'Alterar foto de perfil' })).not.toBeInTheDocument()
  })
})

describe('profile screen as the owner', () => {
  async function openEditDialog() {
    await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }))
    return screen.findByRole('dialog', { name: 'Editar perfil' })
  }

  it('edits name, username and about in one dialog and sends a single PATCH with only what changed', async () => {
    const renamed = {
      ...sampleProfile,
      name: 'Júlio Oliveira',
      handle: 'julio_dev',
      about: 'Novo texto',
      usernameChangeAvailableAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
    vi.mocked(profiles.updateProfile).mockResolvedValue(renamed)
    vi.mocked(profiles.getProfile).mockResolvedValueOnce(sampleProfile).mockResolvedValue(renamed)
    renderProfile('u1', { user: owner })

    const dialog = await openEditDialog()
    await userEvent.clear(within(dialog).getByLabelText('Nome'))
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Júlio Oliveira')
    await userEvent.clear(within(dialog).getByLabelText('@username'))
    await userEvent.type(within(dialog).getByLabelText('@username'), 'Julio_Dev')
    await userEvent.clear(within(dialog).getByLabelText('Sobre'))
    await userEvent.type(within(dialog).getByLabelText('Sobre'), 'Novo texto')
    const postsLoadsBefore = vi.mocked(posts.listPosts).mock.calls.length
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(profiles.updateProfile).toHaveBeenCalledWith({
        name: 'Júlio Oliveira',
        username: 'julio_dev',
        about: 'Novo texto',
      }),
    )
    expect(profiles.updateProfile).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('heading', { level: 1, name: 'Júlio Oliveira' })).toBeInTheDocument()
    expect(screen.getByText('@julio_dev')).toBeInTheDocument()
    expect(screen.getByText('Novo texto')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument())
    await waitFor(() => expect(vi.mocked(posts.listPosts).mock.calls.length).toBeGreaterThan(postsLoadsBefore))
  })

  it('sends only the about when only the about changed', async () => {
    vi.mocked(profiles.updateProfile).mockResolvedValue({ ...sampleProfile, about: 'Só isso' })
    renderProfile('u1', { user: owner })

    const dialog = await openEditDialog()
    await userEvent.clear(within(dialog).getByLabelText('Sobre'))
    await userEvent.type(within(dialog).getByLabelText('Sobre'), 'Só isso')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(profiles.updateProfile).toHaveBeenCalledWith({ about: 'Só isso' }))
  })

  it('shows the username error next to the field and keeps the dialog open', async () => {
    vi.mocked(profiles.updateProfile).mockRejectedValue(
      apiError(409, 'Este @username já está em uso.', { Username: ['Este @username já está em uso.'] }),
    )
    renderProfile('u1', { user: owner })

    const dialog = await openEditDialog()
    await userEvent.clear(within(dialog).getByLabelText('Nome'))
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Outro Nome')
    await userEvent.clear(within(dialog).getByLabelText('@username'))
    await userEvent.type(within(dialog).getByLabelText('@username'), 'ana')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Este @username já está em uso.')
    expect(within(dialog).getByLabelText('@username')).toBeInvalid()
    expect(screen.getByRole('dialog', { name: 'Editar perfil' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Júlio Costa' })).toBeInTheDocument()
  })

  it('shows a general error when the API refuses without naming a field', async () => {
    vi.mocked(profiles.updateProfile).mockRejectedValue(
      apiError(409, 'O @username só pode ser trocado a cada 30 dias.'),
    )
    renderProfile('u1', { user: owner })

    const dialog = await openEditDialog()
    await userEvent.clear(within(dialog).getByLabelText('@username'))
    await userEvent.type(within(dialog).getByLabelText('@username'), 'novo_user')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('só pode ser trocado a cada 30 dias')
  })

  it('does not call the API for invalid values', async () => {
    renderProfile('u1', { user: owner })

    const dialog = await openEditDialog()
    await userEvent.clear(within(dialog).getByLabelText('Nome'))
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'J')
    await userEvent.clear(within(dialog).getByLabelText('@username'))
    await userEvent.type(within(dialog).getByLabelText('@username'), 'a b')

    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(profiles.updateProfile).not.toHaveBeenCalled()
  })

  it('cancels without calling the API and reopens with the saved values', async () => {
    renderProfile('u1', { user: owner })

    const dialog = await openEditDialog()
    await userEvent.clear(within(dialog).getByLabelText('Nome'))
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Rascunho')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument())

    const reopened = await openEditDialog()

    expect(profiles.updateProfile).not.toHaveBeenCalled()
    expect(within(reopened).getByLabelText('Nome')).toHaveValue('Júlio Costa')
  })

  it('locks the username in the dialog while the interval is running', async () => {
    vi.mocked(profiles.getProfile).mockResolvedValue({
      ...sampleProfile,
      usernameChangeAvailableAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    })
    renderProfile('u1', { user: owner })

    const dialog = await openEditDialog()

    expect(within(dialog).getByLabelText('@username')).toBeDisabled()
    expect(within(dialog).getByLabelText('Nome')).toBeEnabled()
  })

  it('uploads a new profile picture from the dialog and closes it', async () => {
    renderProfile('u1', { user: owner })

    await userEvent.click(await screen.findByRole('button', { name: 'Alterar foto de perfil' }))
    const dialog = await screen.findByRole('dialog', { name: 'Foto de perfil' })
    await userEvent.upload(within(dialog).getByLabelText(/Escolha uma imagem/), png)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar foto' }))

    await waitFor(() => expect(profiles.uploadImage).toHaveBeenCalledWith('avatar', png))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Foto de perfil' })).not.toBeInTheDocument())
    expect(profiles.getProfile).toHaveBeenCalledTimes(2)
  })

  it('keeps the picture dialog open and shows the error when the upload fails', async () => {
    vi.mocked(profiles.uploadImage).mockRejectedValue(apiError(400, 'A imagem deve ser PNG, JPEG ou WebP.'))
    renderProfile('u1', { user: owner })

    await userEvent.click(await screen.findByRole('button', { name: 'Alterar foto de perfil' }))
    const dialog = await screen.findByRole('dialog', { name: 'Foto de perfil' })
    await userEvent.upload(within(dialog).getByLabelText(/Escolha uma imagem/), png)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar foto' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('PNG, JPEG ou WebP')
    expect(screen.getByRole('dialog', { name: 'Foto de perfil' })).toBeInTheDocument()
  })

  it('removes the current picture', async () => {
    vi.mocked(profiles.getProfile).mockResolvedValue({ ...sampleProfile, avatarUrl: '/api/profiles/u1/avatar?v=1' })
    renderProfile('u1', { user: owner })

    await userEvent.click(await screen.findByRole('button', { name: 'Alterar foto de perfil' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Remover foto' }))

    await waitFor(() => expect(profiles.removeImage).toHaveBeenCalledWith('avatar'))
  })

  it('going back to the default green sends an empty color and never touches the about', async () => {
    vi.mocked(profiles.getProfile).mockResolvedValue({ ...sampleProfile, accentColor: '#7DD3FC' })
    renderProfile('u1', { user: owner })

    await userEvent.click(await screen.findByRole('button', { name: 'Banner e cor' }))
    const dialog = await screen.findByRole('dialog', { name: 'Banner e cor' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Verde' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar aparência' }))

    await waitFor(() => expect(profiles.updateProfile).toHaveBeenCalledWith({ accentColor: '' }))
  })

  it('saves the color and the banner from the appearance dialog', async () => {
    renderProfile('u1', { user: owner })

    await userEvent.click(await screen.findByRole('button', { name: 'Banner e cor' }))
    const dialog = await screen.findByRole('dialog', { name: 'Banner e cor' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rosa' }))
    await userEvent.upload(within(dialog).getByLabelText(/^Banner .PNG/), png)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar aparência' }))

    await waitFor(() =>
      expect(profiles.updateProfile).toHaveBeenCalledWith({ accentColor: '#F9A8D4' }),
    )
    expect(profiles.uploadImage).toHaveBeenCalledWith('banner', png)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Banner e cor' })).not.toBeInTheDocument(),
    )
  })

  it('removes the banner when asked', async () => {
    vi.mocked(profiles.getProfile).mockResolvedValue({ ...sampleProfile, bannerUrl: '/api/profiles/u1/banner?v=1' })
    renderProfile('u1', { user: owner })

    await userEvent.click(await screen.findByRole('button', { name: 'Banner e cor' }))
    await userEvent.click(await screen.findByLabelText('Remover banner atual'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar aparência' }))

    await waitFor(() => expect(profiles.removeImage).toHaveBeenCalledWith('banner'))
    expect(profiles.uploadImage).not.toHaveBeenCalled()
  })

  it('shows the API error when saving the appearance fails', async () => {
    vi.mocked(profiles.updateProfile).mockRejectedValue(apiError(400, 'A cor de destaque deve estar no formato #RRGGBB.'))
    renderProfile('u1', { user: owner })

    await userEvent.click(await screen.findByRole('button', { name: 'Banner e cor' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar aparência' }))

    const dialog = screen.getByRole('dialog', { name: 'Banner e cor' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('#RRGGBB')
  })
})
