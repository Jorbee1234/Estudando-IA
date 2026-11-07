import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TabList } from './TabList'

const options = [
  { value: 'recent', label: 'Recentes' },
  { value: 'popular', label: 'Populares' },
] as const

describe('TabList', () => {
  it('marks the current option as selected', () => {
    render(<TabList label="Ordenação" options={[...options]} value="recent" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Recentes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Populares' })).toHaveAttribute('aria-selected', 'false')
  })

  it('reports the chosen option', async () => {
    const onChange = vi.fn()
    render(<TabList label="Ordenação" options={[...options]} value="recent" onChange={onChange} />)

    await userEvent.click(screen.getByRole('tab', { name: 'Populares' }))

    expect(onChange).toHaveBeenCalledWith('popular')
  })
})
