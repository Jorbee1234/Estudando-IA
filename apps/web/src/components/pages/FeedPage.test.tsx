import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { samplePost } from '../../test/fixtures'
import { FeedPage } from './FeedPage'

function setup(overrides: Partial<Parameters<typeof FeedPage>[0]> = {}) {
  const handlers = {
    onSortChange: vi.fn(),
    onLoadMore: vi.fn(),
    onLike: vi.fn(),
    onShare: vi.fn(),
    onComment: vi.fn(),
  }
  render(
    <MemoryRouter>
      <FeedPage
        filters={{
          searchText: '',
          onSearchChange: vi.fn(),
          selectedTags: [],
          suggestedTags: [],
          onAddTag: vi.fn(),
          onRemoveTag: vi.fn(),
          onClear: vi.fn(),
        }}
        sort="recent"
        posts={[samplePost]}
        loading={false}
        loadingMore={false}
        hasMore={false}
        {...handlers}
        {...overrides}
      />
    </MemoryRouter>,
  )
  return handlers
}

describe('FeedPage', () => {
  it('lists the posts', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Landing page responsiva' })).toBeInTheDocument()
  })

  it('shows a loading message while the first page loads', () => {
    setup({ posts: [], loading: true })

    expect(screen.getByRole('status')).toHaveTextContent('Carregando posts...')
  })

  it('shows an empty state when nothing matches', () => {
    setup({ posts: [] })

    expect(screen.getByText('Nenhum post encontrado.')).toBeInTheDocument()
  })

  it('shows errors and notices', () => {
    setup({ actionError: 'Falhou', notice: 'Link copiado!' })

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou')
    expect(screen.getByRole('status')).toHaveTextContent('Link copiado!')
  })

  it('switches the sort order', async () => {
    const { onSortChange } = setup()

    await userEvent.click(screen.getByRole('tab', { name: 'Populares' }))

    expect(onSortChange).toHaveBeenCalledWith('popular')
  })

  it('loads more posts on demand', async () => {
    const { onLoadMore } = setup({ hasMore: true })

    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('forwards the post actions', async () => {
    const { onLike } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Curtir 5' }))

    expect(onLike).toHaveBeenCalledWith(samplePost)
  })
})
