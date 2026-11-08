import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { samplePost } from '../test/fixtures'
import { AppLayout } from './AppLayout'
import { FeedRoute } from './FeedRoute'

vi.mock('../services/postService', () => ({
  listPosts: vi.fn(),
  listTags: vi.fn(),
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  listComments: vi.fn(),
  createComment: vi.fn(),
  createPost: vi.fn(),
}))

const service = await import('../services/postService')

const user = { id: 'u1', name: 'Júlio Costa', email: 'julio@example.com', links: [] }

function renderFeed(auth: Partial<AuthContextValue> = {}) {
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
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<FeedRoute />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
  return value
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(service.listPosts).mockResolvedValue({ items: [samplePost], nextCursor: null, links: [] })
  vi.mocked(service.listTags).mockResolvedValue([{ name: 'React', postsCount: 3 }])
  vi.mocked(service.likePost).mockResolvedValue(undefined)
  vi.mocked(service.listComments).mockResolvedValue({ items: [], nextCursor: null, links: [] })
})

describe('feed screen', () => {
  it('shows the feed to visitors, with Entrar in the menu', async () => {
    renderFeed()

    expect(await screen.findByRole('heading', { name: 'Landing page responsiva' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('asks a visitor to log in when they try to like, without calling the API', async () => {
    renderFeed()

    await userEvent.click(await screen.findByRole('button', { name: 'Curtir 5' }))

    expect(await screen.findByRole('dialog', { name: 'Login' })).toBeInTheDocument()
    expect(service.likePost).not.toHaveBeenCalled()
  })

  it('runs the like after the visitor logs in from the dialog', async () => {
    const auth = renderFeed()

    await userEvent.click(await screen.findByRole('button', { name: 'Curtir 5' }))
    await userEvent.type(await screen.findByLabelText('Email'), 'julio@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'Senha@1234')
    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(service.likePost).toHaveBeenCalledWith('p1'))
    expect(auth.login).toHaveBeenCalledWith(
      { email: 'julio@example.com', password: 'Senha@1234' },
      false,
    )
  })

  it('lets a logged in user like right away and shows Sair', async () => {
    renderFeed({ user })

    await userEvent.click(await screen.findByRole('button', { name: 'Curtir 5' }))

    await waitFor(() => expect(service.likePost).toHaveBeenCalledWith('p1'))
    expect(screen.getByRole('button', { name: 'Curtir 6', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('rolls the like back when the API fails', async () => {
    vi.mocked(service.likePost).mockRejectedValue(new Error('boom'))
    renderFeed({ user })

    await userEvent.click(await screen.findByRole('button', { name: 'Curtir 5' }))

    expect(await screen.findByRole('button', { name: 'Curtir 5', pressed: false })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('opens the comments dialog, where visitors are asked to log in to write', async () => {
    renderFeed()

    await userEvent.click(await screen.findByRole('button', { name: 'Comentários 2' }))

    expect(await screen.findByRole('dialog', { name: 'Landing page responsiva' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entre para comentar' })).toBeInTheDocument()
  })

  it('refetches with the tag filter when a suggestion is chosen', async () => {
    renderFeed()

    await userEvent.click(await screen.findByRole('button', { name: 'React' }))

    await waitFor(() =>
      expect(service.listPosts).toHaveBeenLastCalledWith(
        expect.objectContaining({ tags: ['React'] }),
      ),
    )
  })
})
