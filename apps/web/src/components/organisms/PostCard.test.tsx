import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { samplePost } from '../../test/fixtures'
import { PostCard } from './PostCard'

function renderCard(handlers: Partial<Parameters<typeof PostCard>[0]> = {}) {
  render(
    <MemoryRouter>
      <PostCard post={samplePost} onLike={vi.fn()} onShare={vi.fn()} onComment={vi.fn()} {...handlers} />
    </MemoryRouter>,
  )
}

describe('PostCard', () => {
  it('shows the post content, tags and author', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Landing page responsiva' })).toBeInTheDocument()
    expect(screen.getByText('Uma descrição curta.')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('@julio')).toBeInTheDocument()
  })

  it('links the author to their profile', () => {
    renderCard()

    expect(screen.getByRole('link', { name: 'Ver perfil de Júlio Costa' })).toHaveAttribute('href', '/perfil/u1')
  })

  it('shows the picture the author uploaded', () => {
    const post = { ...samplePost, author: { ...samplePost.author, avatarUrl: '/api/profiles/u1/avatar?v=1' } }
    renderCard({ post })

    expect(screen.getByRole('link', { name: 'Ver perfil de Júlio Costa' }).querySelector('img')).toHaveAttribute(
      'src',
      '/api/profiles/u1/avatar?v=1',
    )
  })

  it('shows the placeholder when the post has no cover', () => {
    renderCard()

    expect(screen.getByTestId('thumbnail-placeholder')).toBeInTheDocument()
  })

  it('passes the post to the action handlers', async () => {
    const onLike = vi.fn()
    const onComment = vi.fn()
    renderCard({ onLike, onComment })

    await userEvent.click(screen.getByRole('button', { name: 'Curtir 5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Comentários 2' }))

    expect(onLike).toHaveBeenCalledWith(samplePost)
    expect(onComment).toHaveBeenCalledWith(samplePost)
  })
})
