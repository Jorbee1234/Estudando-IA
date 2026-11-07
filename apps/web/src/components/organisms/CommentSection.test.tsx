import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { sampleComment } from '../../test/fixtures'
import { CommentSection } from './CommentSection'

function setup(overrides: Partial<Parameters<typeof CommentSection>[0]> = {}) {
  const handlers = { onLoadMore: vi.fn(), onRequireAuth: vi.fn(), onSubmit: vi.fn() }
  render(
    <CommentSection
      comments={[sampleComment]}
      loading={false}
      hasMore={false}
      authenticated
      {...handlers}
      {...overrides}
    />,
  )
  return handlers
}

describe('CommentSection', () => {
  it('lists the comments', () => {
    setup()

    expect(screen.getByText('Ficou muito bom!')).toBeInTheDocument()
  })

  it('lets a logged in user write a comment', async () => {
    const { onSubmit } = setup()

    await userEvent.type(screen.getByRole('textbox', { name: 'Escreva um comentário' }), ' Valeu! ')
    await userEvent.click(screen.getByRole('button', { name: 'Comentar' }))

    expect(onSubmit).toHaveBeenCalledWith('Valeu!')
  })

  it('asks visitors to log in instead of showing the form', async () => {
    const { onRequireAuth } = setup({ authenticated: false })

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entre para comentar' }))

    expect(onRequireAuth).toHaveBeenCalledOnce()
  })

  it('shows an empty state', () => {
    setup({ comments: [] })

    expect(screen.getByText('Ainda não há comentários.')).toBeInTheDocument()
  })

  it('loads more comments on demand', async () => {
    const { onLoadMore } = setup({ hasMore: true })

    await userEvent.click(screen.getByRole('button', { name: 'Ver mais comentários' }))

    expect(onLoadMore).toHaveBeenCalledOnce()
  })
})
