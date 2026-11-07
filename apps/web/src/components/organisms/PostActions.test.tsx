import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PostActions } from './PostActions'

function setup(liked = false) {
  const handlers = { onLike: vi.fn(), onShare: vi.fn(), onComment: vi.fn() }
  render(<PostActions likesCount={12} commentsCount={3} liked={liked} {...handlers} />)
  return handlers
}

describe('PostActions', () => {
  it('shows the counters', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Curtir 12' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comentários 3' })).toBeInTheDocument()
  })

  it('calls the matching handler for each button', async () => {
    const { onLike, onShare, onComment } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Curtir 12' }))
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Comentários 3' }))

    expect(onLike).toHaveBeenCalledOnce()
    expect(onShare).toHaveBeenCalledOnce()
    expect(onComment).toHaveBeenCalledOnce()
  })

  it('marks the like as pressed when the user already liked the post', () => {
    setup(true)

    expect(screen.getByRole('button', { name: 'Curtir 12', pressed: true })).toBeInTheDocument()
  })
})
