import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FeedFilters } from './FeedFilters'

function setup(overrides: Partial<Parameters<typeof FeedFilters>[0]> = {}) {
  const handlers = {
    onSearchChange: vi.fn(),
    onAddTag: vi.fn(),
    onRemoveTag: vi.fn(),
    onClear: vi.fn(),
  }
  render(
    <FeedFilters
      searchText=""
      selectedTags={[]}
      suggestedTags={['React', 'CSS']}
      {...handlers}
      {...overrides}
    />,
  )
  return handlers
}

describe('FeedFilters', () => {
  it('reports typing in the search box', async () => {
    const { onSearchChange } = setup()

    await userEvent.type(screen.getByRole('searchbox'), 'a')

    expect(onSearchChange).toHaveBeenCalledWith('a')
  })

  it('adds a suggested tag as a filter', async () => {
    const { onAddTag } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'CSS' }))

    expect(onAddTag).toHaveBeenCalledWith('CSS')
  })

  it('lists selected tags as removable and hides them from the suggestions', async () => {
    const { onRemoveTag } = setup({ selectedTags: ['React'] })

    expect(screen.queryByRole('button', { name: 'React' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remover filtro React' }))

    expect(onRemoveTag).toHaveBeenCalledWith('React')
  })

  it('only offers "Limpar tudo" when there is a filter', async () => {
    const { onClear } = setup({ searchText: 'css' })

    await userEvent.click(screen.getByRole('button', { name: 'Limpar tudo' }))

    expect(onClear).toHaveBeenCalledOnce()
  })

  it('hides "Limpar tudo" without filters', () => {
    setup()

    expect(screen.queryByRole('button', { name: 'Limpar tudo' })).not.toBeInTheDocument()
  })
})
